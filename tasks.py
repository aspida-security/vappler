#!/usr/bin/env python3
import os, requests, traceback, json
from datetime import datetime, timedelta
from celery import Celery
from celery.exceptions import SoftTimeLimitExceeded
from scanner.mapper import NetworkMapper

celery_app = Celery('vappler', broker='redis://vappler-redis:6379/0', backend='redis://vappler-redis:6379/0')
celery_app.conf.update(task_serializer='json', accept_content=['json'], result_serializer='json', timezone='UTC', enable_utc=True, task_track_started=True, task_time_limit=30*60, task_soft_time_limit=25*60, worker_prefetch_multiplier=1, task_acks_late=True)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

def update_scan_status(scan_id: str, status: str, error_msg: str = None, result: dict = None):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return False
    try:
        headers = {"Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"}
        update_data = {"status": status, "updated_at": datetime.utcnow().isoformat()}
        if status == "completed":
            update_data["completed_at"] = datetime.utcnow().isoformat()
        elif status == "running":
            update_data["started_at"] = datetime.utcnow().isoformat()
        if error_msg:
            update_data["error_message"] = error_msg
        if result:
            update_data["result_summary"] = json.dumps(result)
            update_data["vulnerabilities_found"] = result.get("total", 0)
        resp = requests.patch(f"{SUPABASE_URL}/rest/v1/scans?id=eq.{scan_id}", json=update_data, headers=headers, timeout=10)
        return resp.status_code == 204
    except Exception as e:
        print(f"[ERROR] update_scan_status: {str(e)}")
        return False

def save_vulnerabilities(scan_id: str, ws_id: str, vulns: list):
    if not vulns:
        return 0
    try:
        headers = {"Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"}
        records = []
        for v in vulns:
            records.append({"scan_id": scan_id, "workspace_id": ws_id, "cve_id": v.get("cve_id"), "title": v.get("title"), "description": v.get("description"), "severity": v.get("severity"), "cvss_score": v.get("cvss_score"), "affected_asset": v.get("affected_asset"), "port": v.get("port"), "service": v.get("service"), "remediation": v.get("remediation"), "kev_tracked": v.get("kev_tracked", False), "discovered_at": datetime.utcnow().isoformat(), "status": "open"})
        resp = requests.post(f"{SUPABASE_URL}/rest/v1/vulnerabilities", json=records, headers=headers, timeout=10)
        if resp.status_code == 201:
            print(f"[+] Saved {len(records)} vulnerabilities")
            return len(records)
        return 0
    except Exception as e:
        print(f"[ERROR] save_vulnerabilities: {str(e)}")
        return 0

def save_assets(scan_id: str, ws_id: str, assets: list):
    if not assets:
        return 0
    try:
        headers = {"Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"}
        records = []
        for a in assets:
            records.append({"workspace_id": ws_id, "ip_address": a.get("ip_address"), "hostname": a.get("hostname"), "status": "active", "operating_system": a.get("operating_system"), "highest_severity": a.get("highest_severity"), "last_scan": datetime.utcnow().isoformat(), "created_at": datetime.utcnow().isoformat()})
        resp = requests.post(f"{SUPABASE_URL}/rest/v1/assets", json=records, headers=headers, timeout=10)
        if resp.status_code == 201:
            print(f"[+] Saved {len(records)} assets")
            return len(records)
        return 0
    except Exception as e:
        print(f"[ERROR] save_assets: {str(e)}")
        return 0

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def run_nmap_scan(self, target: str, scan_id: str, ws_id: str):
    try:
        print(f"[*] Starting scan {scan_id} for {target}")
        update_scan_status(scan_id, "running")
        mapper = NetworkMapper(target)
        mapper.discover_hosts()
        mapper.scan_services()
        mapper.check_vulnerabilities()
        vulns = mapper.get_vulnerabilities()
        assets = mapper.get_hosts()
        risk_score = mapper.calculate_risk_score()
        print(f"[+] Found {len(vulns)} vulnerabilities, {len(assets)} assets")
        vuln_count = save_vulnerabilities(scan_id, ws_id, vulns)
        asset_count = save_assets(scan_id, ws_id, assets)
        result_summary = {"total": len(vulns), "critical": len([v for v in vulns if v.get("severity") == "Critical"]), "high": len([v for v in vulns if v.get("severity") == "High"]), "medium": len([v for v in vulns if v.get("severity") == "Medium"]), "low": len([v for v in vulns if v.get("severity") == "Low"]), "risk_score": risk_score, "assets_found": len(assets)}
        update_scan_status(scan_id, "completed", result=result_summary)
        print(f"[✓] Scan {scan_id} completed successfully")
        return {"scan_id": scan_id, "status": "completed", "vulnerabilities": vuln_count, "assets": asset_count, "summary": result_summary}
    except SoftTimeLimitExceeded:
        print(f"[!] Scan {scan_id} timeout")
        update_scan_status(scan_id, "timeout", error_msg="Scan exceeded 25 minute limit")
        raise
    except Exception as e:
        error_str = str(e)
        print(f"[ERROR] Scan {scan_id} failed: {error_str}")
        print(traceback.format_exc())
        if self.request.retries < self.max_retries:
            print(f"[*] Retry {self.request.retries + 1}/{self.max_retries}")
            raise self.retry(exc=e, countdown=120)
        else:
            update_scan_status(scan_id, "failed", error_msg=error_str)
            print(f"[✗] Scan {scan_id} failed permanently")
            raise

@celery_app.task(bind=True)
def generate_report(self, scan_id: str, ws_id: str):
    try:
        print(f"[*] Generating report for scan {scan_id}")
        headers = {"Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"}
        scan_resp = requests.get(f"{SUPABASE_URL}/rest/v1/scans?id=eq.{scan_id}", headers=headers, timeout=10)
        scan = scan_resp.json()[0] if scan_resp.json() else {}
        vuln_resp = requests.get(f"{SUPABASE_URL}/rest/v1/vulnerabilities?scan_id=eq.{scan_id}", headers=headers, timeout=10)
        vulns = vuln_resp.json() or []
        report = {"scan_id": scan_id, "generated_at": datetime.utcnow().isoformat(), "target": scan.get("target"), "total_vulnerabilities": len(vulns), "by_severity": {"critical": len([v for v in vulns if v.get("severity") == "Critical"]), "high": len([v for v in vulns if v.get("severity") == "High"]), "medium": len([v for v in vulns if v.get("severity") == "Medium"]), "low": len([v for v in vulns if v.get("severity") == "Low"])}, "vulnerabilities": vulns}
        print(f"[✓] Report generated for {scan_id}")
        return report
    except Exception as e:
        print(f"[ERROR] Report generation: {str(e)}")
        raise

@celery_app.task
def cleanup_old_scans():
    try:
        cutoff_date = (datetime.utcnow() - timedelta(days=90)).isoformat()
        headers = {"Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"}
        resp = requests.delete(f"{SUPABASE_URL}/rest/v1/scans?created_at=lt.{cutoff_date}", headers=headers, timeout=10)
        print(f"[✓] Cleanup completed: {resp.status_code}")
        return {"status": "ok"}
    except Exception as e:
        print(f"[ERROR] Cleanup task: {str(e)}")
        raise
