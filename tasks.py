"""
Celery Tasks for Vappler Security Scanner
Handles asynchronous vulnerability scanning and attack path analysis
"""

import requests
import os
from celery import Celery
from scanner.mapper import NetworkMapper

# Initialize Celery with Redis broker and backend
celery_app = Celery(
    'tasks',
    broker='redis://vappler-redis:6379/0',
    backend='redis://vappler-redis:6379/0'
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

# ← NEW: Supabase configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# ← NEW: Helper function to update scan status via PostgREST
def update_scan_status(scan_id, status, error_message=None):
    """Update scan record status in Supabase via PostgREST"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print(f"[WARN] Cannot update scan status: Missing Supabase config")
        return
    
    url = f"{SUPABASE_URL}/rest/v1/scans"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    # Build update payload
    payload = {"status": status}
    
    if status in ["completed", "failed"]:
        # Use PostgreSQL's now() function for server-side timestamp
        payload["completed_at"] = "now()"
    
    if status == "failed" and error_message:
        payload["error_message"] = error_message
    
    try:
        response = requests.patch(
            f"{url}?id=eq.{scan_id}",
            headers=headers,
            json=payload
        )
        if response.status_code in [200, 204]:
            print(f"[*] Updated scan {scan_id} status to '{status}'")
        else:
            print(f"[WARN] Failed to update scan status: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[ERROR] Exception updating scan status: {str(e)}")


@celery_app.task(name='tasks.run_nmap_scan')
def run_nmap_scan(scan_id, target, scan_type='quick'):
    """
    Run nmap vulnerability scan for a given target.
    
    This task performs:
    1. Host discovery using nmap
    2. Service and version detection
    3. Vulnerability scanning using NSE scripts
    4. Attack path analysis to crown jewel asset
    
    Args:
        scan_id (str): The UUID of the scan record in Supabase
        target (str): Target IP address, hostname, or CIDR range
        scan_type (str): Type of scan to perform. Options:
            - 'quick': Fast scan of common ports
            - 'full': Comprehensive scan of all ports
            Currently defaults to full scan regardless of value
    
    Returns:
        dict: Scan results containing:
            - scan_id: UUID of the scan
            - hosts: List of discovered hosts with services
            - vulnerabilities: List of detected vulnerabilities
            - attack_paths: Calculated attack paths to crown jewel
            - metadata: Scan timing and statistics
    
    Raises:
        Exception: Any scanning errors are caught and returned in result dict
    """
    print(f"[*] ========================================")
    print(f"[*] Celery worker starting Nmap scan")
    print(f"[*] Scan ID: {scan_id}")
    print(f"[*] Target: {target}")
    print(f"[*] Scan Type: {scan_type}")
    print(f"[*] ========================================")
    
    # ← NEW: Update scan status to "scanning"
    update_scan_status(scan_id, "scanning")
    
    try:
        # Step 1: Initialize the NetworkMapper with target
        print(f"[*] Step 1: Initializing NetworkMapper for target: {target}")
        mapper = NetworkMapper(target_range=target)
        
        # Step 2: Discover hosts on the network
        print(f"[*] Step 2: Starting host discovery...")
        mapper.discover_hosts()
        print(f"[*] Host discovery complete. Found {len(mapper.hosts_list)} host(s)")
        
        # Step 3: Scan for vulnerabilities
        print(f"[*] Step 3: Starting vulnerability scan...")
        mapper.find_vulnerabilities()
        print(f"[*] Vulnerability scan complete")
        
        # Step 4: Generate attack path analysis
        print(f"[*] Step 4: Generating attack path analysis...")
        print(f"[*] Crown jewel asset: {target}")
        report = mapper.find_attack_path_for_api(crown_jewel=target)
        
        # Step 5: Inject scan_id into the report
        report['scan_id'] = scan_id
        
        # Log report summary
        print(f"[*] ========================================")
        print(f"[*] Scan completed successfully!")
        print(f"[*] Report contains keys: {list(report.keys())}")
        
        if 'vulnerability_details' in report:
            host_count = len(report.get('vulnerability_details', []))
            print(f"[*] Total hosts in report: {host_count}")
            total_vulns = sum(len(host.get('vulnerabilities', [])) for host in report.get('vulnerability_details', []))
            print(f"[*] Total vulnerabilities: {total_vulns}")
        
        print(f"[*] ========================================")
        
        # ← NEW: Update scan to completed status
        # Note: We don't create assets here - the /scan/<scan_id>/complete endpoint does that
        update_scan_status(scan_id, "completed")
        
        return report
        
    except Exception as e:
        # Catch any errors and return them in a structured format
        error_msg = f"Scan failed for {target}: {str(e)}"
        print(f"[!!!] ========================================")
        print(f"[!!!] ERROR in run_nmap_scan")
        print(f"[!!!] Target: {target}")
        print(f"[!!!] Scan ID: {scan_id}")
        print(f"[!!!] Error: {str(e)}")
        print(f"[!!!] ========================================")
        
        # Print full traceback for debugging
        import traceback
        traceback.print_exc()
        
        # ← NEW: Update scan to failed status
        update_scan_status(scan_id, "failed", error_message=str(e))
        
        # Return error in consistent format
        return {
            "scan_id": scan_id,
            "error": str(e),
            "message": error_msg,
            "vulnerability_details": [],
            "path": []
        }


# Keep this for backwards compatibility if needed
@celery_app.task(name='tasks.run_local_nmap_task')
def run_local_nmap_task(target, crown_jewel_asset, scan_id):
    """
    DEPRECATED: Legacy task name for backwards compatibility.
    Use run_nmap_scan instead.
    """
    print(f"[WARN] run_local_nmap_task is DEPRECATED. Use run_nmap_scan instead.")
    print(f"[WARN] Redirecting to run_nmap_scan...")
    return run_nmap_scan(scan_id=scan_id, target=target, scan_type='quick')
