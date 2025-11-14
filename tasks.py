#!/usr/bin/env python3
"""
Celery Tasks for Vappler Security Scanner
Handles asynchronous vulnerability scanning and attack path analysis
"""

import requests, os, traceback, psycopg2
from celery import Celery
from scanner.mapper import NetworkMapper
# ❌ REMOVE: We are no longer using the supabase-python client here
# from supabase import create_client, Client 

# ... (celery_app definition remains the same) ...
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

# ✅ FIX: Get the DIRECT database connection string
# This assumes your docker-compose.yml passes DATABASE_URL to the worker
# If it doesn't, you must add it there.
DATABASE_URL = os.environ.get("DATABASE_URL")

# ✅ FIX: Get Supabase URL & Service Key for *requests* (for simple updates)
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

def update_scan_status(scan_id, status, error_message=None):
    """Update scan record status in Supabase via PostgREST (requests is fine for this)"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print(f"[WARN] Cannot update scan status: Missing Supabase config")
        return
    
    # ... (this function remains the same, as requests is fine for simple updates) ...
    url = f"{SUPABASE_URL}/rest/v1/scans?id=eq.{scan_id}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY, # PostgREST requires apikey
        "Content-Type": "application/json"
    }
    
    update_data = {"status": status}
    if error_message:
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
    
    # ✅ FIX: Check for DATABASE_URL
    if not DATABASE_URL:
        print("[!!!] WORKER ERROR: DATABASE_URL is not set. Cannot connect to PostgreSQL.")
        raise Exception("Worker missing DATABASE_URL environment variable.")

    conn = None
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

        # --- ✅ START REFACTORED SAVE LOGIC (using psycopg2) ---
        
        assets_saved = 0
        vulns_saved = 0
        
        host_list = result.get("vulnerability_details", [])
        if not host_list:
             print("[!] Mapper returned no vulnerability details. Nothing to save.")

        # Connect to the database
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        for host_data in host_list:
            try:
                # 2. UPSERT ASSET
                asset_payload = (
                    workspace_id,
                    host_data.get("ip_address"),
                    host_data.get("host"),
                    True, # is_active
                    "now()" # last_scan_at
                )
                
                # This raw SQL is faster and uses the constraints we built
                sql_upsert_asset = """
                INSERT INTO public.assets (workspace_id, ip_address, hostname, is_active, last_scan_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (workspace_id, ip_address) DO UPDATE SET
                    hostname = EXCLUDED.hostname,
                    is_active = EXCLUDED.is_active,
                    last_scan_at = EXCLUDED.last_scan_at
                RETURNING id;
                """
                
                cursor.execute(sql_upsert_asset, asset_payload)
                asset_id = cursor.fetchone()[0] # Get the ID of the inserted/updated asset
                assets_saved += 1
                
                # 3. PREPARE & UPSERT VULNERABILITIES for this asset
                vuln_list = host_data.get("vulnerabilities", [])
                if not vuln_list:
                    continue # No vulns for this host, move to next host

                vuln_payloads = []
                for vuln in vuln_list:
                    vuln_payloads.append((
                        workspace_id,
                        asset_id,
                        scan_id,
                        vuln.get("cve"),
                        vuln.get("name"),
                        vuln.get("details"),
                        map_severity(vuln.get("severity")),
                        vuln.get("cvss_score"),
                        "open", # status
                        vuln.get("port"),
                        vuln.get("service"),
                        "now()" # discovered_at
                    ))

                if vuln_payloads:
                    # Use psycopg2's 'extras' for a fast bulk upsert
                    from psycopg2.extras import execute_values
                    
                    sql_upsert_vulns = """
                    INSERT INTO public.vulnerabilities (
                        workspace_id, asset_id, scan_id, cve_id, title, description,
                        severity, cvss_score, status, port, service, discovered_at
                    )
                    VALUES %s
                    ON CONFLICT (asset_id, title, port) DO UPDATE SET
                        description = EXCLUDED.description,
                        severity = EXCLUDED.severity,
                        cvss_score = EXCLUDED.cvss_score,
                        status = 'open',
                        discovered_at = EXCLUDED.discovered_at;
                    """
                    
                    execute_values(cursor, sql_upsert_vulns, vuln_payloads)
                    vulns_saved += len(vuln_payloads)

            except Exception as save_err:
                conn.rollback() # Rollback this specific host
                print(f"[!!!] Failed to save data for host {host_data.get('ip_address')}: {save_err}")
                traceback.print_exc()
            else:
                conn.commit() # Commit changes for this host

        # --- ✅ END REFACTORED SAVE LOGIC ---
        
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
        if conn:
            conn.rollback() # Rollback any uncommitted changes
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
    finally:
        if conn:
            cursor.close()
            conn.close()


# ... (generate_report and cleanup_old_scans remain the same) ...

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