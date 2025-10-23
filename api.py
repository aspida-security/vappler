from flask import Flask, request, jsonify
from tasks import run_local_nmap_task, run_hackertarget_task
from flask_cors import CORS 
# --- VULCAN FIX 1: Imports for Supabase setup and dependencies ---
import os
from datetime import datetime
from supabase import create_client, Client # 'supabase' is the actual module name for supabase-py
# --- VULCAN FIX 2: Supabase Client Initialization ---
# Environment variables must be loaded via docker-compose.yml `env_file: .env`
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY") 

try:
    # Use the ANON key as we are relying on RLS policies for auth/permissions
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"!!! Supabase Client Init Error: {e}")
    # The application can't function without the client
# -------------------------------------------------------------\n
app = Flask(__name__)
CORS(app)

@app.route('/scan', methods=['POST'])
def start_scan():
    data = request.get_json()
    target = data.get('target')
    crown_jewel_asset = data.get('crown_jewel')
    scan_type = data.get('scan_type', 'local')
    # VULCAN FIX 3: Required parameters from the front-end
    workspace_id = data.get('workspace_id')
    user_id = data.get('user_id')

    if not target or not crown_jewel_asset or not workspace_id or not user_id:
        return jsonify({"error": "'target', 'crown_jewel', 'workspace_id', and 'user_id' are required."}), 400

    # --- VULCAN FIX 4: Create Scan Record in DB and retrieve scan_id ---
    try:
        new_scan_data = {
            "workspace_id": workspace_id,
            "name": f"{target} ({scan_type.capitalize()})", # More descriptive name
            "target_count": 1, 
            "status": "running",
            "created_by": user_id, 
            "started_at": datetime.now().isoformat()
        }
        
        # Insert the record and retrieve the newly created ID
        res = supabase.table('scans').insert(new_scan_data).execute()
        
        # Supabase client returns a response object; we need the data
        scan_record = res.data[0]
        scan_id = scan_record['id']
        print(f"[*] New scan record created with ID: {scan_id}")
    except Exception as e:
        print(f"!!! Error creating scan record: {e}")
        return jsonify({"error": f"Failed to initialize scan in database: {e}"}), 500
    # -------------------------------------------------------------------\n
    if scan_type == 'local':
        # --- VULCAN FIX 5: Pass scan_id to the Celery task ---
        task = run_local_nmap_task.delay(target, crown_jewel_asset, scan_id)
    elif scan_type == 'external':
        # --- VULCAN FIX 5: Pass scan_id to the Celery task ---
        task = run_hackertarget_task.delay(target, crown_jewel_asset, scan_id)
    else:
        # Should not be reached, but for completeness
        return jsonify({"error": "Invalid scan_type. Must be 'local' or 'external'."}), 400

    # --- VULCAN FIX 6: Return both task_id and scan_id to the frontend ---
    return jsonify({"task_id": task.id, "scan_id": scan_id}), 202

@app.route('/results/<task_id>', methods=['GET'])
def get_results(task_id):
    # ... (function remains unchanged)
    task = run_local_nmap_task.AsyncResult(task_id)
    if task.state == 'PENDING':
        response = {'state': task.state, 'status': 'Pending...'}
    elif task.state == 'SUCCESS':
        response = {'state': task.state, 'result': task.result}
    else:
        response = {'state': task.state, 'status': str(task.info)}
    return jsonify(response)