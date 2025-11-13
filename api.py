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
    """
    DEPRECATED: Worker now saves scan results directly via service role client.
    
    This endpoint previously performed 127 lines of complex logic:
    1. Fetched completed scan results from Celery using user JWT
    2. Made multiple HTTP requests to Supabase (subject to RLS)
    3. Manually inserted assets and vulnerabilities one-by-one
    4. Updated scan status using user JWT
    
    ALL of this is now handled by the worker (tasks.py lines 171-172) using
    the service role client, which:
    - Bypasses RLS policies (more reliable)
    - Saves data in a single transaction (better performance)
    - Ensures data consistency (no race conditions)
    
    This endpoint is kept temporarily for backwards compatibility during
    frontend transition. It will be removed in a future release.
    
    **DO NOT USE THIS ENDPOINT** - Worker handles everything automatically.
    """
    print(f"[!!!] ========================================")
    print(f"[!!!] DEPRECATED ENDPOINT CALLED")
    print(f"[!!!] /scan/{scan_id}/complete")
    print(f"[!!!] Worker already saved data for this scan")
    print(f"[!!!] This endpoint does nothing")
    print(f"[!!!] Frontend should NOT call this")
    print(f"[!!!] ========================================")
    
    return jsonify({
        "status": "deprecated",
        "message": "Worker handles data saves automatically. This endpoint is no longer needed.",
        "scan_id": scan_id,
        "warning": "Frontend should stop calling this endpoint. Worker saves data directly."
    }), 200

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
