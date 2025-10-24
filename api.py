# FILE: api.py
import os
import requests
import traceback
import base64 # Added for JWT decoding (optional debug)
import json   # Added for JWT decoding (optional debug)
from flask import Flask, request, jsonify
from flask_cors import CORS
from tasks import run_local_nmap_task, run_hackertarget_task #

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# Load Supabase connection details from environment variables
# Ensure these variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are set in your backend environment
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") #
SUPABASE_ANON_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY") #

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("[!!!] ERROR: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.")
    # Consider raising an exception or exiting if these are critical

@app.route('/scan', methods=['POST'])
def start_scan():
    try:
        # 1. Get user JWT from incoming request Authorization header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            print("[!!!] /scan error: Missing or invalid Authorization header.")
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        user_jwt = auth_header.split(" ", 1)[1]
        # --- VULCAN DEBUG: Log token prefix/presence ---
        print(f"[*] /scan: Received Authorization header (Bearer token type).")
        # --- END VULCAN DEBUG ---

        # 2. Prepare payload from the frontend request
        payload = request.get_json()
        target = payload.get('target') #
        crown_jewel_asset = payload.get('crown_jewel') #
        scan_type = payload.get('scan_type', 'local') #
        # **IMPORTANT**: Ensure the frontend sends 'workspace_id' in the payload
        workspace_id = payload.get("workspace_id")

        if not target or not crown_jewel_asset: #
            return jsonify({"error": "'target' and 'crown_jewel' are required."}), 400 #
        if not workspace_id:
            print("[!!!] /scan error: workspace_id missing from request payload.")
            return jsonify({"error": "workspace_id is required in the request body"}), 400

        # 3. Call Supabase PostgREST endpoint WITH user's JWT and ANON Key
        postgrest_url = f"{SUPABASE_URL}/rest/v1/scans"
        headers = {
            "Authorization": f"Bearer {user_jwt}", # Forward the user's token
            "apikey": SUPABASE_ANON_KEY,          # Use the ANON key for API gateway auth
            "Content-Type": "application/json",
            "Prefer": "return=representation"   # Ask Supabase to return the created row
        }

        # Prepare the data for the new scan row
        # Note: 'created_by' is NOT set here. RLS policy uses auth.uid() from JWT context.
        new_scan_data = {
            "workspace_id": workspace_id,
            "name": f"Scan for {target}",
            "scan_type": scan_type,
            "status": 'scheduled', # Initial status
            "target_count": 1 # Placeholder, adjust as needed
            # Add other relevant fields based on your 'scans' table schema if needed
        }

        # --- VULCAN DEBUG: Log outgoing headers and payload just before request ---
        print(f"[*] /scan: Sending POST to {postgrest_url}")
        print(f"    Outgoing Headers:")
        # Mask the token for security in logs, but confirm its structure
        masked_auth = headers.get("Authorization","")[:15] + "..." if headers.get("Authorization","") else "Not Present"
        print(f"        Authorization: {masked_auth}")
        print(f"        apikey: {'Present' if headers.get('apikey') else 'MISSING!'}")
        print(f"        Content-Type: {headers.get('Content-Type')}")
        print(f"        Prefer: {headers.get('Prefer')}")
        print(f"    Outgoing JSON Payload: {json.dumps(new_scan_data)}")
        # Optional: Decode JWT payload for 'sub' (user id) - requires no secret
        try:
            # Ensure padding is correct for base64 decoding
            padding = '=' * (4 - len(user_jwt.split('.')[1]) % 4)
            jwt_payload_bytes = base64.urlsafe_b64decode(user_jwt.split('.')[1] + padding)
            jwt_payload = json.loads(jwt_payload_bytes.decode('utf-8'))
            print(f"    JWT 'sub' (User ID): {jwt_payload.get('sub')}")
        except Exception as jwt_decode_err:
            print(f"    [WARN] Could not decode JWT payload: {jwt_decode_err}")
        # --- END VULCAN DEBUG ---

        response = requests.post(postgrest_url, json=new_scan_data, headers=headers)

        # 4. Handle Response from Supabase PostgREST
        if response.status_code == 201: # 201 Created is the expected success code for INSERT
            created_scan = response.json()[0] # Supabase returns an array with the new row
            scan_id = created_scan['id']
            print(f"[*] /scan: Scan record created successfully via PostgREST. Scan ID: {scan_id}")

            # 5. Queue the Celery task (pass the newly created scan_id)
            if scan_type == 'local': #
                # Pass scan_id to the Celery task
                task = run_local_nmap_task.delay(target, crown_jewel_asset, scan_id) # Pass scan_id
            elif scan_type == 'external': #
                # Pass scan_id to the Celery task
                task = run_hackertarget_task.delay(target, crown_jewel_asset, scan_id) # Pass scan_id
            else:
                 # This check might be redundant if frontend validates, but good practice
                 return jsonify({"error": "Invalid scan_type. Must be 'local' or 'external'."}), 400 #

            print(f"[*] /scan: Celery task '{task.id}' queued for scan '{scan_id}'.")
            return jsonify({"task_id": task.id}), 202 #

        else:
            # The INSERT failed. Log details.
            error_detail = response.text
            print(f"[!!!] /scan error: PostgREST INSERT failed.")
            print(f"    Status Code: {response.status_code}")
            # --- VULCAN DEBUG: Log the *full* response body ---
            print(f"    Response Body:\n{error_detail}\n")
            # --- END VULCAN DEBUG ---
            # Check specifically for RLS again
            if response.status_code in (401, 403) or \
               '"new row violates row-level security policy"' in error_detail:
                 print("[!!!] CRITICAL: RLS denial still occurring. Check JWT validity/claims, RLS policy, or DB roles.")
                 # Return the actual detailed error from Supabase
                 return jsonify({"error": f"Database RLS denied the request: {error_detail}"}), 403
            else:
                 # Other DB error (schema mismatch, constraint violation etc.)
                 return jsonify({"error": "Database insert failed", "status_code": response.status_code, "detail": error_detail}), 500

    except Exception as e:
        print(f"[!!!] Unhandled exception in /scan endpoint: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Internal server error: {e}"}), 500

@app.route('/results/<task_id>', methods=['GET'])
def get_results(task_id): #
    # Check status of Celery task (works for both local and external tasks)
    # Correctly reference the Celery app instance from tasks.py
    # Assuming the task functions are imported from tasks.py where celery_app is defined
    from tasks import celery_app
    task = celery_app.AsyncResult(task_id) # Use the imported celery_app

    print(f"[*] /results/{task_id}: Checking task state: {task.state}")

    if task.state == 'PENDING': #
        response = {'state': task.state, 'status': 'Pending...'} #
    elif task.state == 'SUCCESS': #
        response = {'state': task.state, 'result': task.result} #
    elif task.state == 'FAILURE':
        print(f"[!!!] /results/{task_id}: Task failed. Info: {task.info}")
        response = {'state': task.state, 'status': str(task.info)} #
    else:
        response = {'state': task.state, 'status': f'In progress ({task.state})...'}

    return jsonify(response) #

if __name__ == '__main__':
     print("Starting Flask development server...")
     # Use debug=True ONLY for development, it enables auto-reloading and detailed error pages
     app.run(host='0.0.0.0', port=5000, debug=True)