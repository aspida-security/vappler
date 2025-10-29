# FILE: api.py
import os
import requests
import traceback
import base64 # Added for JWT decoding (optional debug)
import json   # Added for JWT decoding (optional debug)
from flask import Flask, request, jsonify
from flask_cors import CORS
from tasks import run_local_nmap_task, run_hackertarget_task # Ensure tasks.py imports celery_app correctly

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# --- CONFIRMATION: Correctly reading from environment variables ---
# Load Supabase connection details from environment variables
# These are now set via docker-compose.yml which reads from .env
SUPABASE_URL = os.environ.get("SUPABASE_URL") # Reads SUPABASE_URL set in docker-compose
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY") # Reads SUPABASE_ANON_KEY set in docker-compose
# --- END CONFIRMATION ---

# You might need the SERVICE key later, you can load it similarly:
# SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("[!!!] ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.")
    # In a containerized setup, these should always be present if docker-compose is correct.
    # Consider raising an exception here to halt startup if they are missing.
    # raise EnvironmentError("Missing required Supabase environment variables!")
else:
    print(f"[*] API configured with SUPABASE_URL: {SUPABASE_URL}") # Log the URL being used

@app.route('/scan', methods=['POST'])
def start_scan():
    try:
        # 1. Get user JWT from incoming request Authorization header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            print("[!!!] /scan error: Missing or invalid Authorization header.")
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        user_jwt = auth_header.split(" ", 1)[1]
        print(f"[*] /scan: Received Authorization header (Bearer token type).")

        # 2. Prepare payload from the frontend request
        payload = request.get_json()
        target = payload.get('target')
        crown_jewel_asset = payload.get('crown_jewel')
        scan_type = payload.get('scan_type', 'local')
        workspace_id = payload.get("workspace_id")

        if not target or not crown_jewel_asset:
            return jsonify({"error": "'target' and 'crown_jewel' are required."}), 400
        if not workspace_id:
            print("[!!!] /scan error: workspace_id missing from request payload.")
            return jsonify({"error": "workspace_id is required in the request body"}), 400

        # --- CONFIRMATION: Using the correct environment variables ---
        # 3. Call Supabase PostgREST endpoint WITH user's JWT and ANON Key
        postgrest_url = f"{SUPABASE_URL}/rest/v1/scans" # Uses the SUPABASE_URL loaded above
        headers = {
            "Authorization": f"Bearer {user_jwt}",
            "apikey": SUPABASE_ANON_KEY, # Uses the SUPABASE_ANON_KEY loaded above
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        # --- END CONFIRMATION ---

        # Prepare the data for the new scan row
        new_scan_data = {
            "workspace_id": workspace_id,
            "name": f"Scan for {target}",
            "scan_type": scan_type,
            "status": 'scheduled',
            "target_count": 1
            # Add user_id if your table requires it AND RLS doesn't handle it
            # "user_id": user_id_from_jwt, # You'd need to decode the JWT to get this
        }

        print(f"[*] /scan: Sending POST to {postgrest_url}") # Log will show the correct local URL now
        print(f"    Outgoing Headers:")
        masked_auth = headers.get("Authorization","")[:15] + "..." if headers.get("Authorization","") else "Not Present"
        print(f"        Authorization: {masked_auth}")
        print(f"        apikey: {'Present' if headers.get('apikey') else 'MISSING!'}")
        print(f"        Content-Type: {headers.get('Content-Type')}")
        print(f"        Prefer: {headers.get('Prefer')}")
        print(f"    Outgoing JSON Payload: {json.dumps(new_scan_data)}")

        # Optional: Decode JWT payload for 'sub' (user id)
        user_id_from_jwt = None
        try:
            padding = '=' * (4 - len(user_jwt.split('.')[1]) % 4)
            jwt_payload_bytes = base64.urlsafe_b64decode(user_jwt.split('.')[1] + padding)
            jwt_payload = json.loads(jwt_payload_bytes.decode('utf-8'))
            user_id_from_jwt = jwt_payload.get('sub')
            print(f"    JWT 'sub' (User ID): {user_id_from_jwt}")
            # --- VULCAN CHANGE: Add user_id to payload if needed ---
            # Uncomment the line below IF your scans table requires user_id AND
            # your RLS policy for INSERT doesn't automatically use auth.uid()
            # new_scan_data["user_id"] = user_id_from_jwt
            # --- END VULCAN CHANGE ---
        except Exception as jwt_decode_err:
            print(f"    [WARN] Could not decode JWT payload: {jwt_decode_err}")

        # --- VULCAN CHANGE: Add user_id to payload IF it wasn't added above and is required ---
        # Make sure user_id is included if your table requires it
        # This check confirms the code from gemini-2.5-pro analysis about adding user_id
        if "user_id" not in new_scan_data and user_id_from_jwt:
             # Check if your scans table actually has a user_id column and if it's required.
             # If yes, uncomment the following line:
             # new_scan_data["user_id"] = user_id_from_jwt
             print("[*] Note: user_id obtained from JWT but not added to payload (assuming RLS handles it).")
        # --- END VULCAN CHANGE ---

        response = requests.post(postgrest_url, json=new_scan_data, headers=headers)

        # 4. Handle Response from Supabase PostgREST
        if response.status_code == 201:
            created_scan = response.json()[0]
            scan_id = created_scan['id']
            print(f"[*] /scan: Scan record created successfully via PostgREST. Scan ID: {scan_id}")

            # 5. Queue the Celery task
            # --- VULCAN CHANGE: Pass scan_id to Celery task ---
            if scan_type == 'local':
                task = run_local_nmap_task.delay(target, crown_jewel_asset, scan_id) # Pass scan_id
            elif scan_type == 'external':
                 # Assuming external task also needs scan_id
                task = run_hackertarget_task.delay(target, crown_jewel_asset, scan_id) # Pass scan_id
            else:
                 return jsonify({"error": "Invalid scan_type. Must be 'local' or 'external'."}), 400

            print(f"[*] /scan: Celery task '{task.id}' queued for scan '{scan_id}'.")
            return jsonify({"task_id": task.id}), 202
            # --- END VULCAN CHANGE ---

        else:
            error_detail = response.text
            print(f"[!!!] /scan error: PostgREST INSERT failed.")
            print(f"    Status Code: {response.status_code}")
            print(f"    Response Body:\n{error_detail}\n")
            # Specific check for RLS-like errors
            if response.status_code in (401, 403) or \
               'security policy' in error_detail or \
               'permission denied' in error_detail:
                 print("[!!!] CRITICAL: RLS denial detected. Check JWT validity/claims, RLS policy on 'scans' table, or DB roles.")
                 return jsonify({"error": f"Database RLS denied the request: {error_detail}"}), 403
            # Check for missing column errors (like user_id if not nullable)
            elif 'null value in column' in error_detail or 'violates not-null constraint' in error_detail:
                 print(f"[!!!] CRITICAL: Database NOT NULL constraint violation. Ensure all required columns (like 'user_id'?) are in the payload: {new_scan_data}")
                 return jsonify({"error": f"Database constraint violation: {error_detail}", "sent_payload": new_scan_data}), 400
            else:
                 return jsonify({"error": "Database insert failed", "status_code": response.status_code, "detail": error_detail}), 500

    except requests.exceptions.ConnectionError as conn_err:
        print(f"[!!!] /scan connection error: Could not connect to Supabase URL '{SUPABASE_URL}'. Is it running and accessible?")
        print(f"    Error details: {conn_err}")
        return jsonify({"error": f"Could not connect to Supabase at {SUPABASE_URL}", "details": str(conn_err)}), 503 # Service Unavailable
    except Exception as e:
        print(f"[!!!] Unhandled exception in /scan endpoint: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Internal server error: {e}"}), 500

@app.route('/results/<task_id>', methods=['GET'])
def get_results(task_id):
    # --- VULCAN CHANGE: Import celery_app correctly ---
    try:
        from tasks import celery_app # Import within function to avoid potential circular imports
        task = celery_app.AsyncResult(task_id)
    except ImportError:
         print("[!!!] /results error: Could not import celery_app from tasks.py")
         return jsonify({"error": "Celery app not configured correctly"}), 500
    # --- END VULCAN CHANGE ---

    print(f"[*] /results/{task_id}: Checking task state: {task.state}")

    if task.state == 'PENDING':
        response = {'state': task.state, 'status': 'Pending...'}
    elif task.state == 'SUCCESS':
        response = {'state': task.state, 'result': task.result}
    elif task.state == 'FAILURE':
        print(f"[!!!] /results/{task_id}: Task failed. Info: {task.info}")
        # Ensure task.info is serializable, convert Exception to string
        status_info = str(task.info) if isinstance(task.info, Exception) else task.info
        response = {'state': task.state, 'status': status_info}
    else: # Covers STARTED, RETRY, etc.
        response = {'state': task.state, 'status': f'In progress ({task.state})...'}

    return jsonify(response)

if __name__ == '__main__':
     print("Starting Flask development server...")
     # Use debug=True for development ONLY
     app.run(host='0.0.0.0', port=5000, debug=True)