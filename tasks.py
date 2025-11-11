#!/usr/bin/env python3
"""
Celery Tasks for Vappler Security Scanner
Handles asynchronous vulnerability scanning and attack path analysis
"""

import requests, os, traceback
from celery import Celery
from scanner.mapper import NetworkMapper

# Initialize Celery with Redis broker and backend
celery_app = Celery(
    'tasks',
    broker='redis://vappler-redis:6379/0',
    backend='redis://vappler-redis:6379/0'
)

# ✅ CRITICAL FIX: Configure Celery with extended result expiration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    result_expires=7200,  # ✅ Keep results for 2 hours (enough for long scans + frontend polling)
    task_track_started=True,  # ✅ Track when tasks start (helps with PENDING detection)
    task_acks_late=True,  # ✅ Acknowledge tasks after completion
    worker_prefetch_multiplier=1,  # ✅ Process one task at a time for long-running scans
)

# Supabase configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

def update_scan_status(scan_id, status, error_message=None):
    """Update scan record status in Supabase via PostgREST"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print(f"[WARN] Cannot update scan status: Missing Supabase config")
        return
    
    url = f"{SUPABASE_URL}/rest/v1/scans?id=eq.{scan_id}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json"
    }
    
    update_data = {"status": status}
    if error_message:
        update_data["error_message"] = error_message
    
    try:
        resp = requests.patch(url, json=update_data, headers=headers, timeout=10)
        if resp.status_code == 200 or resp.status_code == 204:
            print(f"[*] Updated scan {scan_id} status to '{status}'")
        else:
            print(f"[WARN] Failed to update scan status: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"[ERROR] update_scan_status exception: {e}")

def save_assets_to_supabase(scan_id, workspace_id, assets_list):
    """Save discovered assets to Supabase"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY or not assets_list:
        return 0
    
    url = f"{SUPABASE_URL}/rest/v1/assets"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    saved_count = 0
    for asset in assets_list:
        payload = {
            "workspace_id": workspace_id,
            "scan_id": scan_id,
            "ip_address": asset.get("ip_address"),
            "hostname": asset.get("hostname"),
            "status": asset.get("status", "active"),
            "os_type": asset.get("os_type"),
            "open_ports": asset.get("open_ports", [])
        }
        
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            if resp.status_code in [200, 201, 204]:
                saved_count += 1
            else:
                print(f"[WARN] Failed to save asset {asset.get('ip_address')}: {resp.status_code}")
        except Exception as e:
            print(f"[ERROR] save_assets exception for {asset.get('ip_address')}: {e}")
    
    return saved_count

def save_vulnerabilities_to_supabase(scan_id, workspace_id, vulnerabilities_list):
    """Save discovered vulnerabilities to Supabase"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY or not vulnerabilities_list:
        return 0
    
    url = f"{SUPABASE_URL}/rest/v1/vulnerabilities"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    saved_count = 0
    for vuln in vulnerabilities_list:
        payload = {
            "workspace_id": workspace_id,
            "scan_id": scan_id,
            "asset_id": vuln.get("asset_id"),
            "cve_id": vuln.get("cve_id"),
            "title": vuln.get("title"),
            "description": vuln.get("description"),
            "severity": vuln.get("severity", "unknown"),
            "cvss_score": vuln.get("cvss_score"),
            "affected_component": vuln.get("affected_component"),
            "remediation": vuln.get("remediation"),
            "status": vuln.get("status", "open")
        }
        
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            if resp.status_code in [200, 201, 204]:
                saved_count += 1
            else:
                print(f"[WARN] Failed to save vuln {vuln.get('cve_id')}: {resp.status_code}")
        except Exception as e:
            print(f"[ERROR] save_vulnerabilities exception for {vuln.get('cve_id')}: {e}")
    
    return saved_count

@celery_app.task(bind=True, max_retries=3)
def run_nmap_scan(self, scan_id, target, workspace_id, scan_type='quick'):
    """
    Execute nmap vulnerability scan and save results to Supabase
    
    Args:
        scan_id: UUID of the scan record in Supabase
        target: IP/hostname to scan
        workspace_id: Workspace UUID
        scan_type: Type of scan (quick/full/custom)
    """
    try:
        print(f"[*] Starting scan {scan_id} for target {target}")
        update_scan_status(scan_id, "running")
        
        # Initialize mapper and run scan
        mapper = NetworkMapper(target)
        print(f"[*] Discovering hosts in {target}...")
        mapper.discover_hosts()
        
        if not mapper.hosts_list:
            print("[!] No hosts found.")
            update_scan_status(scan_id, "failed", error_message="No hosts discovered")
            return {"error": "No hosts found", "scan_id": scan_id}
        
        print(f"[*] Running vulnerability detection...")
        mapper.find_vulnerabilities()
        
        # Use first discovered host as crown jewel for attack path
        crown_jewel = mapper.hosts_list[0]
        print(f"[*] Calculating attack path to {crown_jewel}...")
        result = mapper.find_attack_path_for_api(crown_jewel)
        
        # Save results to Supabase
        assets_saved = save_assets_to_supabase(scan_id, workspace_id, result.get("assets", []))
        vulns_saved = save_vulnerabilities_to_supabase(scan_id, workspace_id, result.get("vulnerabilities", []))
        
        print(f"[✓] Saved {assets_saved} assets and {vulns_saved} vulnerabilities")
        
        if "error" in result:
            print(f"[!] Scan completed with warnings: {result['error']}")
            update_scan_status(scan_id, "completed", error_message=result['error'])
        else:
            print(f"[✓] Scan {scan_id} completed successfully")
            update_scan_status(scan_id, "completed")
        
        # ✅ CRITICAL FIX: Return full result with vulnerability_details for /complete endpoint
        return {
            "scan_id": scan_id,
            "assets_saved": assets_saved,
            "vulnerabilities_saved": vulns_saved,
            "status": "completed",
            "vulnerability_details": result.get("vulnerability_details", [])  # ✅ ADD THIS
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
            raise

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
