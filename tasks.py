#!/usr/bin/env python3
"""
Celery Tasks for Vappler Security Scanner
Handles asynchronous vulnerability scanning and attack path analysis
"""

import requests, os, traceback
from celery import Celery
from scanner.mapper import NetworkMapper
# ✅ FIX: Import Supabase client
from supabase import create_client, Client

# Initialize Celery with Redis broker and backend
celery_app = Celery(
    'tasks',
    broker='redis://vappler-redis:6379/0',
    backend='redis://vappler-redis:6379/0'
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    result_expires=7200,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# Supabase configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# ✅ FIX: Create a dedicated service client for the worker
def get_service_client():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("[!!!] WORKER ERROR: Missing Supabase environment variables.")
        return None
    try:
        return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    except Exception as e:
        print(f"[!!!] Failed to initialize Service Role Client in worker: {e}")
        return None

def update_scan_status(scan_id, status, error_message=None):
    """Update scan record status in Supabase via PostgREST"""
    service_client = get_service_client()
    if not service_client:
        print(f"[WARN] Cannot update scan status: Service client not available.")
        return
    
    url = f"{SUPABASE_URL}/rest/v1/scans?id=eq.{scan_id}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY, # PostgREST requires apikey
        "Content-Type": "application/json"
    }
    
    update_data = {"status": status}
    if error_message:
        # Assuming your 'scans' table has an 'error_message' text column
        update_data["description"] = f"Error: {error_message}"
    if status == "completed" or status == "failed":
        update_data["completed_at"] = "now()"
    
    try:
        resp = requests.patch(url, json=update_data, headers=headers, timeout=10)
        if resp.status_code == 200 or resp.status_code == 204:
            print(f"[*] Updated scan {scan_id} status to '{status}'")
        else:
            print(f"[WARN] Failed to update scan status: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"[ERROR] update_scan_status exception: {e}")

# ❌ DEPRECATED: This logic is flawed and will be moved into the main task
# def save_assets_to_supabase(scan_id, workspace_id, assets_list):
#     ...

# ❌ DEPRECATED: This logic is flawed and will be moved into the main task
# def save_vulnerabilities_to_supabase(scan_id, workspace_id, vulnerabilities_list):
#     ...

# ✅ FIX: Helper function to map severity strings to the DB enum
def map_severity(severity_str):
    if not severity_str: return 'Info'
    lower = severity_str.lower()
    if lower == 'critical': return 'Critical'
    if lower == 'high': return 'High'
    if lower == 'medium': return 'Medium'
    if lower == 'low': return 'Low'
    return 'Info'

@celery_app.task(bind=True, max_retries=3)
def run_nmap_scan(self, scan_id, target, workspace_id, scan_type='quick'):
    print(f"[*] Starting scan {scan_id} for target {target}")
    service_client = get_service_client()
    if not service_client:
        raise Exception("Worker failed to get Supabase service client.")

    try:
        update_scan_status(scan_id, "running")
        
        mapper = NetworkMapper(target)
        print(f"[*] Discovering hosts in {target}...")
        mapper.discover_hosts()
        
        if not mapper.hosts_list:
            print("[!] No hosts found.")
            update_scan_status(scan_id, "failed", error_message="No hosts discovered")
            return {"error": "No hosts found", "scan_id": scan_id, "assets_saved": 0, "vulns_saved": 0}
        
        print(f"[*] Hosts discovered: {mapper.hosts_list}")
        print(f"[*] Running vulnerability scan...")
        mapper.find_vulnerabilities()
        print(f"[*] Vulnerability scan complete.")

        crown_jewel = mapper.hosts_list[0]
        print(f"[*] Calculating attack path to {crown_jewel}...")
        result = mapper.find_attack_path_for_api(crown_jewel)
        
        if "error" in result:
            update_scan_status(scan_id, "failed", error_message=result['error'])
            return {**result, "scan_id": scan_id, "assets_saved": 0, "vulns_saved": 0}

        # ✅ --- START REFACTORED SAVE LOGIC ---
        
        assets_saved = 0
        vulns_saved = 0
        
        # 1. Get the list of host objects from the mapper's result
        host_list = result.get("vulnerability_details", [])
        if not host_list:
             print("[!] Mapper returned no vulnerability details. Nothing to save.")

        for host_data in host_list:
            try:
                # 2. UPSERT ASSET
                asset_payload = {
                    "workspace_id": workspace_id,
                    "ip_address": host_data.get("ip_address"),
                    "hostname": host_data.get("host"),
                    "is_active": True,
                    "last_scan_at": "now()",
                    # TODO: Add 'operating_system' if mapper provides it
                }
                
                # Use on_conflict to update existing assets
                asset_upsert_resp = service_client.table("assets").upsert(
                    asset_payload, 
                    on_conflict="workspace_id,ip_address"
                ).execute()

                if not asset_upsert_resp.data:
                    raise Exception(f"Asset upsert failed: {asset_upsert_resp.error}")

                asset_id = asset_upsert_resp.data[0]['id']
                assets_saved += 1
                
                # 3. PREPARE & UPSERT VULNERABILITIES for this asset
                vuln_list = host_data.get("vulnerabilities", [])
                if not vuln_list:
                    continue # No vulns for this host, move to next host

                vuln_payloads = []
                for vuln in vuln_list:
                    vuln_payloads.append({
                        "workspace_id": workspace_id,
                        "asset_id": asset_id,
                        "scan_id": scan_id,
                        "cve_id": vuln.get("cve"),
                        "title": vuln.get("name"),
                        "description": vuln.get("details"),
                        "severity": map_severity(vuln.get("severity")),
                        "cvss_score": vuln.get("cvss_score"),
                        "status": "open",
                        "port": vuln.get("port"),
                        "service": vuln.get("service"),
                        "discovered_at": "now()",
                        # "has_exploit": vuln.get("has_exploit") # Add this in Phase 3
                    })

                if vuln_payloads:
                    # Use on_conflict to update existing vulns
                    vuln_upsert_resp = service_client.table("vulnerabilities").upsert(
                        vuln_payloads,
                        on_conflict="asset_id,title,port" # Assumes this is your unique constraint
                    ).execute()
                    
                    if vuln_upsert_resp.error:
                        raise Exception(f"Vuln upsert failed: {vuln_upsert_resp.error.message}")
                    
                    vulns_saved += len(vuln_upsert_resp.data)

            except Exception as save_err:
                print(f"[!!!] Failed to save data for host {host_data.get('ip_address')}: {save_err}")
                traceback.print_exc()
        
        # ✅ --- END REFACTORED SAVE LOGIC ---

        print(f"[✓] Saved {assets_saved} assets and {vulns_saved} vulnerabilities")
        update_scan_status(scan_id, "completed")
        
        return {
            "scan_id": scan_id,
            "assets_saved": assets_saved,
            "vulnerabilities_saved": vulns_saved,
            "status": "completed",
            "vulnerability_details": result.get("vulnerability_details", [])
        }
    
    except Exception as e:
        error_str = str(e)
        print(f"[ERROR] Scan {scan_id} failed: {error_str}")
        print(traceback.format_exc())
        
        if self.request.retries < self.max_retries:
            print(f"[*] Retry {self.request.retries + 1}/{self.max_retries}")
            update_scan_status(scan_id, "retrying")
            raise self.retry(exc=e, countdown=120)
        else:
            update_scan_status(scan_id, "failed", error_message=error_str)
            return {"error": error_str, "scan_id": scan_id, "assets_saved": 0, "vulns_saved": 0}

@celery_app.task
def generate_report(scan_id, workspace_id):
    """Generate PDF/HTML report for completed scan"""
    print(f"[*] Generating report for scan {scan_id}")
    # TODO: Implement report generation
    return {"scan_id": scan_id, "status": "report_generated"}

@celery_app.task
def cleanup_old_scans():
    """Clean up old scan records (runs periodically)"""
    print("[*] Running cleanup task...")
    # TODO: Implement cleanup logic
    return {"status": "cleanup_complete"}