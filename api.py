#!/usr/bin/env python3
import os, json, traceback, jwt
from datetime import datetime
from functools import wraps
from typing import Dict, Optional
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from tasks import run_nmap_scan, celery_app

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("[ERROR] Missing SUPABASE_URL or SUPABASE_ANON_KEY")
    exit(1)

def extract_jwt(auth_header: str) -> Optional[Dict]:
    try:
        if not auth_header.startswith("Bearer "):
            return None
        token = auth_header.replace("Bearer ", "")
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded
    except Exception as e:
        print(f"[JWT] {str(e)}")
        return None

def verify_workspace(user_id: str, workspace_id: str) -> bool:
    try:
        headers = {"Authorization": f"Bearer {SUPABASE_ANON_KEY}"}
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/workspace_members?user_id=eq.{user_id}&workspace_id=eq.{workspace_id}",
            headers=headers,
            timeout=5
        )
        return resp.status_code == 200 and len(resp.json()) > 0
    except Exception as e:
        print(f"[VERIFY] {str(e)}")
        return False

def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header:
            return {"error": "Missing Authorization"}, 401
        user = extract_jwt(auth_header)
        if not user:
            return {"error": "Invalid token"}, 401
        request.user_id = user.get("sub")
        return f(*args, **kwargs)
    return decorated

def workspace_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        ws_id = request.args.get("workspace_id") or (request.json.get("workspace_id") if request.json else None)
        if not ws_id:
            return {"error": "workspace_id required"}, 400
        if not verify_workspace(request.user_id, ws_id):
            return {"error": "Forbidden"}, 403
        return f(*args, **kwargs)
    return decorated

def fmt_vuln(v):
    return {"id": v.get("id"), "cve_id": v.get("cve_id"), "title": v.get("title"), "severity": v.get("severity"), "cvss_score": v.get("cvss_score"), "status": v.get("status"), "affected_asset": v.get("affected_asset"), "port": v.get("port"), "service": v.get("service"), "discovered_at": v.get("discovered_at"), "kev_tracked": v.get("kev_tracked", False)}

def fmt_asset(a):
    return {"id": a.get("id"), "ip_address": a.get("ip_address"), "hostname": a.get("hostname"), "status": a.get("status"), "operating_system": a.get("operating_system"), "highest_severity": a.get("highest_severity"), "last_scan": a.get("last_scan"), "created_at": a.get("created_at")}

def fmt_scan(s):
    return {"id": s.get("id"), "target": s.get("target"), "status": s.get("status"), "scan_type": s.get("scan_type"), "result_summary": s.get("result_summary"), "created_at": s.get("created_at"), "completed_at": s.get("completed_at"), "vulnerabilities_found": s.get("vulnerabilities_found", 0)}

def calc_risk(severity_counts):
    score = (severity_counts.get("critical", 0) * 40 + severity_counts.get("high", 0) * 25 + severity_counts.get("medium", 0) * 20 + severity_counts.get("low", 0) * 10)
    total = sum(severity_counts.values())
    return min(100.0, (score / (total * 40)) * 100) if total > 0 else 0.0

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()}), 200

@app.route("/api/metrics", methods=["GET"])
@auth_required
@workspace_required
def metrics():
    try:
        ws_id = request.args.get("workspace_id")
        headers = {"Authorization": f"Bearer {SUPABASE_ANON_KEY}"}
        vuln_resp = requests.get(f"{SUPABASE_URL}/rest/v1/vulnerabilities?workspace_id=eq.{ws_id}&select=severity", headers=headers, timeout=5)
        asset_resp = requests.get(f"{SUPABASE_URL}/rest/v1/assets?workspace_id=eq.{ws_id}&select=id", headers=headers, timeout=5)
        scan_resp = requests.get(f"{SUPABASE_URL}/rest/v1/scans?workspace_id=eq.{ws_id}&order=created_at.desc&limit=1", headers=headers, timeout=5)
        vulns = vuln_resp.json() if vuln_resp.status_code == 200 else []
        assets = asset_resp.json() if asset_resp.status_code == 200 else []
        scans = scan_resp.json() if scan_resp.status_code == 200 else []
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        for v in vulns:
            sev = v.get("severity", "info").lower()
            if sev in severity_counts:
                severity_counts[sev] += 1
        return jsonify({"total_vulnerabilities": sum(severity_counts.values()), "critical": severity_counts["critical"], "high": severity_counts["high"], "medium": severity_counts["medium"], "low": severity_counts["low"], "total_assets": len(assets), "last_scan": scans[0].get("completed_at") if scans else None, "scan_status": scans[0].get("status") if scans else "idle", "risk_score": calc_risk(severity_counts)}), 200
    except Exception as e:
        print(f"[METRICS] {traceback.format_exc()}")
        return {"error": str(e)}, 500

@app.route("/api/dashboard/summary", methods=["GET"])
@auth_required
@workspace_required
def dashboard_summary():
    try:
        ws_id = request.args.get("workspace_id")
        headers = {"Authorization": f"Bearer {SUPABASE_ANON_KEY}"}
        top_vuln_resp = requests.get(f"{SUPABASE_URL}/rest/v1/vulnerabilities?workspace_id=eq.{ws_id}&order=cvss_score.desc&limit=10", headers=headers, timeout=5)
        hosts_resp = requests.get(f"{SUPABASE_URL}/rest/v1/assets?workspace_id=eq.{ws_id}&order=highest_severity.desc&limit=5", headers=headers, timeout=5)
        scans_resp = requests.get(f"{SUPABASE_URL}/rest/v1/scans?workspace_id=eq.{ws_id}&order=created_at.desc&limit=5", headers=headers, timeout=5)
        metrics_resp = requests.get(f"http://localhost:5000/api/metrics?workspace_id={ws_id}", headers={"Authorization": request.headers.get("Authorization")}, timeout=5)
        return jsonify({"metrics": metrics_resp.json() if metrics_resp.status_code == 200 else {}, "top_vulnerabilities": [fmt_vuln(v) for v in (top_vuln_resp.json() or [])], "vulnerable_hosts": [fmt_asset(h) for h in (hosts_resp.json() or [])], "recent_scans": [fmt_scan(s) for s in (scans_resp.json() or [])]}), 200
    except Exception as e:
        print(f"[SUMMARY] {traceback.format_exc()}")
        return {"error": str(e)}, 500

@app.route("/api/vulnerabilities", methods=["GET"])
@auth_required
@workspace_required
def get_vulnerabilities():
    try:
        ws_id = request.args.get("workspace_id")
        severity = request.args.get("severity", "all")
        status = request.args.get("status", "all")
        search = request.args.get("search", "")
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 20))
        headers = {"Authorization": f"Bearer {SUPABASE_ANON_KEY}", "Range": f"{(page-1)*limit}-{page*limit-1}", "Range-Unit": "items"}
        query = f"?workspace_id=eq.{ws_id}&order=discovered_at.desc"
        if severity != "all":
            query += f"&severity=eq.{severity}"
        if status != "all":
            query += f"&status=eq.{status}"
        if search:
            query += f"&or=(cve_id.ilike.%{search}%,title.ilike.%{search}%)"
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/vulnerabilities{query}", headers=headers, timeout=5)
        if resp.status_code not in [200, 206]:
            return {"error": "Failed to fetch"}, 500
        vulns = [fmt_vuln(v) for v in resp.json()]
        total = int(resp.headers.get("Content-Range", "0/0").split("/")[1]) if "Content-Range" in resp.headers else len(vulns)
        return jsonify({"data": vulns, "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit}}), 200
    except Exception as e:
        print(f"[VULNS] {traceback.format_exc()}")
        return {"error": str(e)}, 500

@app.route("/api/vulnerabilities/<vuln_id>", methods=["GET"])
@auth_required
def get_vulnerability(vuln_id):
    try:
        headers = {"Authorization": f"Bearer {SUPABASE_ANON_KEY}"}
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/vulnerabilities?id=eq.{vuln_id}", headers=headers, timeout=5)
        if resp.status_code != 200 or not resp.json():
            return {"error": "Not found"}, 404
        return jsonify(fmt_vuln(resp.json()[0])), 200
    except Exception as e:
        print(f"[VULN] {traceback.format_exc()}")
        return {"error": str(e)}, 500

@app.route("/api/vulnerabilities/<vuln_id>/status", methods=["PATCH"])
@auth_required
def update_vulnerability_status(vuln_id):
    try:
        data = request.get_json()
        new_status = data.get("status")
        if not new_status:
            return {"error": "status required"}, 400
        headers = {"Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"}
        resp = requests.patch(f"{SUPABASE_URL}/rest/v1/vulnerabilities?id=eq.{vuln_id}", json={"status": new_status, "updated_at": datetime.utcnow().isoformat()}, headers=headers, timeout=5)
        if resp.status_code != 204:
            return {"error": "Failed to update"}, 500
        return jsonify({"success": True}), 200
    except Exception as e:
        print(f"[UPDATE_VULN] {traceback.format_exc()}")
        return {"error": str(e)}, 500

@app.route("/api/assets", methods=["GET"])
@auth_required
@workspace_required
def get_assets():
    try:
        ws_id = request.args.get("workspace_id")
        status = request.args.get("status", "all")
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 20))
        headers = {"Authorization": f"Bearer {SUPABASE_ANON_KEY}", "Range": f"{(page-1)*limit}-{page*limit-1}", "Range-Unit": "items"}
        query = f"?workspace_id=eq.{ws_id}&order=last_scan.desc"
        if status != "all":
            query += f"&status=eq.{status}"
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/assets{query}", headers=headers, timeout=5)
        if resp.status_code not in [200, 206]:
            return {"error": "Failed to fetch"}, 500
        assets = [fmt_asset(a) for a in resp.json()]
        total = int(resp.headers.get("Content-Range", "0/0").split("/")[1]) if "Content-Range" in resp.headers else len(assets)
        return jsonify({"data": assets, "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit}}), 200
    except Exception as e:
        print(f"[ASSETS] {traceback.format_exc()}")
        return {"error": str(e)}, 500

@app.route("/api/assets/<asset_id>", methods=["GET"])
@auth_required
def get_asset(asset_id):
    try:
        headers = {"Authorization": f"Bearer {SUPABASE_ANON_KEY}"}
        asset_resp = requests.get(f"{SUPABASE_URL}/rest/v1/assets?id=eq.{asset_id}", headers=headers, timeout=5)
        if asset_resp.status_code != 200 or not asset_resp.json():
            return {"error": "Not found"}, 404
        asset = fmt_asset(asset_resp.json()[0])
        vuln_resp = requests.get(f"{SUPABASE_URL}/rest/v1/vulnerabilities?affected_asset=eq.{asset_id}", headers=headers, timeout=5)
        asset["vulnerabilities"] = [fmt_vuln(v) for v in (vuln_resp.json() or [])]
        return jsonify(asset), 200
    except Exception as e:
        print(f"[ASSET] {traceback.format_exc()}")
        return {"error": str(e)}, 500

@app.route("/api/scan", methods=["POST"])
@auth_required
@workspace_required
def start_scan():
    try:
        data = request.get_json()
        target = data.get("target")
        ws_id = data.get("workspace_id")
        if not target or not ws_id:
            return {"error": "target and workspace_id required"}, 400
        headers = {"Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"}
        scan_record = {"workspace_id": ws_id, "target": target, "scan_type": "full", "status": "pending", "created_by": request.user_id, "created_at": datetime.utcnow().isoformat()}
        db_resp = requests.post(f"{SUPABASE_URL}/rest/v1/scans", json=scan_record, headers=headers, timeout=5)
        if db_resp.status_code != 201:
            return {"error": "Failed to create scan"}, 500
        scan_id = db_resp.json()[0]["id"]
        task = run_nmap_scan.delay(target, scan_id, ws_id)
        return jsonify({"scan_id": scan_id, "task_id": task.id, "status": "pending", "target": target}), 202
    except Exception as e:
        print(f"[SCAN] {traceback.format_exc()}")
        return {"error": str(e)}, 500

@app.route("/api/scans", methods=["GET"])
@auth_required
@workspace_required
def get_scans():
    try:
        ws_id = request.args.get("workspace_id")
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))
        headers = {"Authorization": f"Bearer {SUPABASE_ANON_KEY}", "Range": f"{(page-1)*limit}-{page*limit-1}", "Range-Unit": "items"}
        query = f"?workspace_id=eq.{ws_id}&order=created_at.desc"
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/scans{query}", headers=headers, timeout=5)
        if resp.status_code not in [200, 206]:
            return {"error": "Failed to fetch"}, 500
        scans = [fmt_scan(s) for s in resp.json()]
        total = int(resp.headers.get("Content-Range", "0/0").split("/")[1]) if "Content-Range" in resp.headers else len(scans)
        return jsonify({"data": scans, "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit}}), 200
    except Exception as e:
        print(f"[SCANS] {traceback.format_exc()}")
        return {"error": str(e)}, 500

@app.route("/api/scans/<scan_id>", methods=["GET"])
@auth_required
def get_scan(scan_id):
    try:
        headers = {"Authorization": f"Bearer {SUPABASE_ANON_KEY}"}
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/scans?id=eq.{scan_id}", headers=headers, timeout=5)
        if resp.status_code != 200 or not resp.json():
            return {"error": "Not found"}, 404
        return jsonify(fmt_scan(resp.json()[0])), 200
    except Exception as e:
        print(f"[SCAN] {traceback.format_exc()}")
        return {"error": str(e)}, 500

@app.route("/api/workspaces", methods=["GET"])
@auth_required
def get_workspaces():
    try:
        user_id = request.user_id
        headers = {"Authorization": f"Bearer {SUPABASE_ANON_KEY}"}
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/workspace_members?user_id=eq.{user_id}", headers=headers, timeout=5)
        if resp.status_code != 200:
            return {"error": "Failed to fetch"}, 500
        members = resp.json()
        workspaces = []
        for member in members:
            ws_resp = requests.get(f"{SUPABASE_URL}/rest/v1/workspaces?id=eq.{member.get('workspace_id')}", headers=headers, timeout=5)
            if ws_resp.status_code == 200 and ws_resp.json():
                workspaces.append(ws_resp.json()[0])
        return jsonify({"data": workspaces}), 200
    except Exception as e:
        print(f"[WORKSPACES] {traceback.format_exc()}")
        return {"error": str(e)}, 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Server error"}), 500

if __name__ == "__main__":
    print("[*] Starting Vappler API...")
    app.run(host="0.0.0.0", port=5000, debug=os.environ.get("FLASK_ENV") == "development")
