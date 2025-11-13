# FILE: backend/api/api.py

import os
import requests
import traceback
import jwt
from functools import wraps
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from tasks import run_nmap_scan, celery_app
from supabase import create_client, Client

app = Flask(__name__)
CORS(app)

# Load Supabase connection details
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_SERVICE_KEY:
    print("[!!!] ERROR: Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_KEY")
    exit(1)

print(f"[*] API configured with SUPABASE_URL: {SUPABASE_URL}")
print(f"[*] Loaded SUPABASE_SERVICE_KEY: {SUPABASE_SERVICE_KEY[:15]}...")

try:
    service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print("[✓] Service Role Client initialized (bypasses RLS)")
except Exception as e:
    print(f"[!!!] Failed to initialize Service Role Client: {e}")
    service_client = None

# Authentication decorator
def auth_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing Authorization header"}), 401
        
        # ✅ FIXED: Extract token string correctly
        token = auth_header.split("Bearer ")[1]
        
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            g.user_id = payload.get("sub")
            
            if not g.user_id:
                return jsonify({"error": "Invalid token"}), 401
            
            print(f"[✓] Authenticated user: {g.user_id}")
        except Exception as e:
            print(f"[!!!] Auth error: {str(e)}")
            return jsonify({"error": "Token validation failed"}), 401
        
        return f(*args, **kwargs)
    return decorated_function

# Test route
@app.route('/api/test-auth', methods=['GET'])
@auth_required
def test_auth():
    return jsonify({"message": "Authentication successful!", "created_by": g.user_id}), 200

@app.route('/scan', methods=['POST'])
@auth_required
def start_scan():
    """Initiate a new vulnerability scan"""
    try:
        # 1. Get payload from request
        payload = request.get_json()
        target = payload.get('target')
        scan_type = payload.get('scan_type', 'quick')
        workspace_id = payload.get("workspace_id")
        
        if not target:
            return jsonify({"error": "'target' is required."}), 400
        
        if not workspace_id:
            print("[!!!] /scan error: workspace_id missing from request payload.")
            return jsonify({"error": "workspace_id is required"}), 400
        
        # 2. Create scan record in Supabase using service_client (bypasses RLS)
        new_scan_data = {
            "workspace_id": workspace_id,
            "name": f"Scan for {target}",
            "scan_type": scan_type,
            "status": 'running',
            "target_count": 1,
            "created_by": g.user_id    # ✅ Add the authenticated user's ID from JWT
        }
        
        print(f"[*] /scan: Creating scan record in Supabase for user {g.user_id}")
        response = service_client.table("scans").insert(new_scan_data).execute()
        
        if response.data and len(response.data) > 0:
            created_scan = response.data[0]
            scan_id = created_scan['id']
            print(f"[*] /scan: Scan record created. Scan ID: {scan_id}")
            
            # 3. Queue Celery task with correct parameters
            print(f"[*] /scan: Queuing Celery task...")
            task = run_nmap_scan.delay(scan_id, target, workspace_id, scan_type)
            print(f"[*] /scan: Celery task '{task.id}' queued for scan '{scan_id}'")
            
            # 4. Return BOTH scan_id and task_id to frontend
            return jsonify({
                "scan_id": scan_id,
                "task_id": task.id
            }), 202
        else:
            print(f"[!!!] /scan error: Service client INSERT failed.")
            print(f"     Response: {response}")
            return jsonify({"error": "Database insert failed", "detail": str(response)}), 500
            
    except Exception as e:
        print(f"[!!!] Unhandled exception in /scan endpoint: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Internal server error: {e}"}), 500

@app.route('/scan/<scan_id>/complete', methods=['POST'])
def complete_scan(scan_id):
    """Process completed scan results and save to Supabase"""
    try:
        # 1. Get user JWT
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing Authorization header"}), 401
        
        user_jwt = auth_header.split(" ", 1)[1]
        
        # 2. Get task_id from request
        payload = request.get_json()
        task_id = payload.get('task_id')
        
        if not task_id:
            return jsonify({"error": "task_id is required"}), 400
        
        print(f"[*] /scan/{scan_id}/complete: Processing completion for task {task_id}")
        
        # 3. Retrieve task result from Celery
        task = celery_app.AsyncResult(task_id)
        
        if task.state != 'SUCCESS':
            print(f"[!!!] Task {task_id} is not in SUCCESS state: {task.state}")
            return jsonify({"error": f"Task not complete. Current state: {task.state}"}), 400
        
        # 4. Get the scan results
        scan_results = task.result
        print(f"[*] Retrieved scan results. Keys: {list(scan_results.keys())}")
        
        # 5. Prepare headers for Supabase requests
        headers = {
            "Authorization": f"Bearer {user_jwt}",
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        # 6. Get workspace_id from scan record
        scan_url = f"{SUPABASE_URL}/rest/v1/scans?id=eq.{scan_id}&select=workspace_id"
        scan_response = requests.get(scan_url, headers=headers)
        
        if scan_response.status_code != 200 or not scan_response.json():
            print(f"[!!!] Could not fetch scan record for {scan_id}")
            return jsonify({"error": "Scan not found"}), 404
        
        workspace_id = scan_response.json()[0]['workspace_id']
        print(f"[*] Found workspace_id: {workspace_id}")
        
        # 7. Save assets to Supabase
        vulnerability_details = scan_results.get('vulnerability_details', [])
        print(f"[*] Processing {len(vulnerability_details)} hosts...")
        
        assets_saved = 0
        vulns_saved = 0
        
        for host_data in vulnerability_details:
            host_ip = host_data.get('ip_address')
            hostname = host_data.get('host', host_ip)
            
            # Create asset record
            asset_data = {
                "workspace_id": workspace_id,
                "hostname": hostname,
                "ip_address": host_ip,
                "status": "online",
                "last_scan": "now()"
            }
            
            asset_url = f"{SUPABASE_URL}/rest/v1/assets"
            asset_response = requests.post(asset_url, json=asset_data, headers=headers)
            
            if asset_response.status_code == 201:
                assets_saved += 1
                asset_id = asset_response.json()[0]['id']
                print(f"[*] Created asset: {hostname} ({host_ip}) - ID: {asset_id}")
                
                # Save vulnerabilities for this asset
                vulnerabilities = host_data.get('vulnerabilities', [])
                for vuln in vulnerabilities:
                    vuln_data = {
                        "workspace_id": workspace_id,
                        "asset_id": asset_id,
                        "scan_id": scan_id,
                        "cve_id": vuln.get('cve_id'),
                        "service": vuln.get('service', 'Unknown'),
                        "port": vuln.get('port'),
                        "severity": vuln.get('severity', 'Unknown'),
                        "cvss_score": vuln.get('cvss_score', 0.0),
                        "description": vuln.get('description', ''),
                        "status": "open"
                    }
                    
                    vuln_url = f"{SUPABASE_URL}/rest/v1/vulnerabilities"
                    vuln_response = requests.post(vuln_url, json=vuln_data, headers=headers)
                    
                    if vuln_response.status_code == 201:
                        vulns_saved += 1
            else:
                print(f"[!!!] Failed to create asset {hostname}: {asset_response.text}")
        
        # 8. Update scan status to 'completed'
        update_url = f"{SUPABASE_URL}/rest/v1/scans?id=eq.{scan_id}"
        update_data = {
            "status": "completed",
            "completed_at": "now()"
        }
        
        update_response = requests.patch(update_url, json=update_data, headers=headers)
        
        if update_response.status_code == 200:
            print(f"[*] Scan {scan_id} marked as completed")
        else:
            print(f"[!!!] Failed to update scan status: {update_response.text}")
        
        # 9. Return success
        return jsonify({
            "message": "Scan results processed successfully",
            "assets_saved": assets_saved,
            "vulnerabilities_saved": vulns_saved
        }), 200
    
    except Exception as e:
        print(f"[!!!] Error in /scan/{scan_id}/complete: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/results/<task_id>', methods=['GET'])
def get_results(task_id):
    """Check Celery task status"""
    try:
        task = celery_app.AsyncResult(task_id)
        print(f"[*] /results/{task_id}: Task state: {task.state}")
        
        if task.state == 'PENDING':
            response = {'state': task.state, 'status': 'Pending...'}
        elif task.state == 'SUCCESS':
            response = {'state': task.state, 'result': task.result}
        elif task.state == 'FAILURE':
            print(f"[!!!] /results/{task_id}: Task failed. Info: {task.info}")
            status_info = str(task.info) if isinstance(task.info, Exception) else task.info
            response = {'state': task.state, 'status': status_info}
        else:
            response = {'state': task.state, 'status': f'In progress ({task.state})...'}
        
        return jsonify(response)
    
    except Exception as e:
        print(f"[!!!] Error in /results/{task_id}: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask development server...")
    app.run(host='0.0.0.0', port=5000, debug=True)
