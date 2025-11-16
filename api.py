# FILE: api.py
# DESCRIPTION: Final, merged API file with JWT auth, scan endpoints,
# and all RLS-secured MVP read endpoints.

import os
import requests
import traceback
import jwt
import json 
from functools import wraps
from flask import Flask, request, jsonify, g, send_from_directory
from flask_cors import CORS
from tasks import run_nmap_scan, celery_app, generate_report
from supabase import create_client, Client

app = Flask(__name__)
CORS(app)

# Load Supabase connection details from environment
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_SERVICE_KEY:
    print("[!!!] ERROR: Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_KEY")
    exit(1)

print(f"[*] API configured with SUPABASE_URL: {SUPABASE_URL}")
print(f"[*] Loaded SUPABASE_SERVICE_KEY: {SUPABASE_SERVICE_KEY[:15]}...")

# --- Service Role Client (Bypasses RLS) ---
# Used ONLY for privileged backend operations (like /scan insert or worker tasks)
try:
    service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print("[✓] Service Role Client initialized (bypasses RLS)")
except Exception as e:
    print(f"[!!!] Failed to initialize Service Role Client: {e}")
    service_client = None

# ============================================================================
# 🔐 AUTHENTICATION
# ============================================================================

def auth_required(f):
    """
    Authentication decorator.
    Validates JWT and creates a user-specific client (g.user_client)
    that respects RLS policies for all decorated routes.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        
        token = auth_header.split("Bearer ")[1]
        
        try:
            # Decode JWT to get user ID ('sub')
            # We don't verify signature here; Supabase PostgREST will do that.
            payload = jwt.decode(token, options={"verify_signature": False})
            g.user_id = payload.get("sub")
            
            if not g.user_id:
                return jsonify({"error": "Invalid token: Missing 'sub' (user ID)"}), 401
            
            # --- SECURE CLIENT CREATION ---
            # Create a new client instance for this specific user.
            # This client is authenticated *as the user* and will
            # automatically enforce all database-level RLS policies.
            g.user_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            g.user_client.postgrest.auth(token)
            # --- END SECURE CLIENT CREATION ---

            print(f"[✓] Auth: User {g.user_id} authenticated. RLS-client created.")
        
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        except Exception as e:
            print(f"[!!!] Auth error: {str(e)}")
            return jsonify({"error": "Token validation failed"}), 500
        
        return f(*args, **kwargs)
    return decorated_function

# ============================================================================
# 🚀 CORE SCANNING ENDPOINTS
# ============================================================================

@app.route('/api/test-auth', methods=['GET'])
@auth_required
def test_auth():
    """Test route to confirm authentication and g.user_id works"""
    return jsonify({"message": "Authentication successful!", "user_id": g.user_id}), 200

@app.route('/scan', methods=['POST'])
@auth_required
def start_scan():
    """
    Initiate a new vulnerability scan.
    Uses @auth_required to get user_id, but uses the
    service_client to *insert* the scan record, bypassing RLS for inserts.
    """
    try:
        payload = request.get_json()
        target = payload.get('target')
        scan_type = payload.get('scan_type', 'quick')
        workspace_id = payload.get("workspace_id")
        
        if not target or not workspace_id:
            return jsonify({"error": "'target' and 'workspace_id' are required."}), 400
        
        # 1. Create scan record using the privileged service_client
        new_scan_data = {
            "workspace_id": workspace_id,
            "name": f"Scan for {target}",
            "scan_type": scan_type,
            "status": 'running', # Worker will update this
            "target_count": 1,
            "created_by": g.user_id,    # Link to authenticated user
            "target": target          # Store the target
        }
        
        print(f"[*] /scan: Creating scan record for user {g.user_id}")
        response = service_client.table("scans").insert(new_scan_data).execute()
        
        if response.data and len(response.data) > 0:
            created_scan = response.data[0]
            scan_id = created_scan['id']
            print(f"[*] /scan: Scan record created. Scan ID: {scan_id}")
            
            # 2. Queue Celery task
            print(f"[*] /scan: Queuing Celery task...")
            task = run_nmap_scan.delay(scan_id, target, workspace_id, scan_type)
            print(f"[*] /scan: Celery task '{task.id}' queued for scan '{scan_id}'")
            
            return jsonify({"scan_id": scan_id, "task_id": task.id}), 202
        else:
            print(f"[!!!] /scan error: Service client INSERT failed: {response}")
            return jsonify({"error": "Database insert failed", "detail": str(response)}), 500
            
    except Exception as e:
        print(f"[!!!] Unhandled exception in /scan endpoint: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Internal server error: {e}"}), 500

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

# ============================================================================
# 📊 MVP READ ENDPOINTS (New & Refactored)
# All endpoints below use g.user_client to enforce RLS automatically.
# ============================================================================

@app.route('/api/workspaces', methods=['GET'])
@auth_required
def get_workspaces():
    """
    GET /api/workspaces
    Returns all workspaces the user has access to (via RLS).
    This is now a single, secure, and efficient query.
    """
    try:
        # RLS is enforced automatically by g.user_client
        response = g.user_client.table("workspaces").select("*").execute()
        
        workspaces = response.data or []
        print(f"[✓] /api/workspaces: Returned {len(workspaces)} workspaces for user {g.user_id}")
        return jsonify(workspaces), 200
        
    except Exception as e:
        print(f"[ERROR] /api/workspaces: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch workspaces", "detail": str(e)}), 500


@app.route('/api/workspaces/<workspace_id>/stats', methods=['GET'])
@auth_required
def get_workspace_stats(workspace_id):
    """
    GET /api/workspaces/<workspace_id>/stats
    Returns aggregated stats for a *single* workspace.
    RLS is enforced on every query by g.user_client.
    If the user cannot access the workspace, all counts will be 0.
    """
    try:
        # Total assets
        assets_response = g.user_client.table("assets") \
            .select("id", count="exact") \
            .eq("workspace_id", workspace_id) \
            .execute()
        
        # Total vulnerabilities
        vulns_response = g.user_client.table("vulnerabilities") \
            .select("id", count="exact") \
            .eq("workspace_id", workspace_id) \
            .execute()
        
        # Critical vulnerabilities
        critical_response = g.user_client.table("vulnerabilities") \
            .select("id", count="exact") \
            .eq("workspace_id", workspace_id) \
            .eq("severity", "Critical") \
            .eq("status", "open") \
            .execute()
        
        # Active scans
        scans_response = g.user_client.table("scans") \
            .select("id", count="exact") \
            .eq("workspace_id", workspace_id) \
            .in_("status", ["running", "scheduled"]) \
            .execute()
        
        # Average risk score from assets
        assets_risk_response = g.user_client.table("assets") \
            .select("risk_score") \
            .eq("workspace_id", workspace_id) \
            .execute()
        
        avg_risk_score = 0.0
        if assets_risk_response.data:
            scores = [a.get("risk_score", 0.0) or 0.0 for a in assets_risk_response.data]
            avg_risk_score = sum(scores) / len(scores) if scores else 0.0
        
        stats = {
            "totalAssets": assets_response.count or 0,
            "totalVulnerabilities": vulns_response.count or 0,
            "criticalVulns": critical_response.count or 0,
            "activeScans": scans_response.count or 0,
            "riskScore": round(avg_risk_score, 1)
        }
        
        print(f"[✓] /api/workspaces/{workspace_id}/stats: {stats}")
        return jsonify(stats), 200
        
    except Exception as e:
        print(f"[ERROR] /api/workspaces/{workspace_id}/stats: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch stats", "detail": str(e)}), 500


@app.route('/api/assets', methods=['GET'])
@auth_required
def get_assets():
    """
    GET /api/assets?workspace_id=<id>
    Returns all assets for a workspace, respecting RLS.
    """
    try:
        workspace_id = request.args.get('workspace_id')
        if not workspace_id:
            return jsonify({"error": "workspace_id query param required"}), 400
        
        # RLS is enforced by g.user_client
        assets_response = g.user_client.table("assets") \
            .select("*, vulnerabilities(count)") \
            .eq("workspace_id", workspace_id) \
            .order("risk_score", desc=True) \
            .execute()
        
        assets = assets_response.data or []
        
        print(f"[✓] /api/assets: Returned {len(assets)} assets for workspace {workspace_id}")
        return jsonify(assets), 200
        
    except Exception as e:
        print(f"[ERROR] /api/assets: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch assets", "detail": str(e)}), 500


@app.route('/api/vulnerabilities', methods=['GET'])
@auth_required
def get_vulnerabilities():
    """
    GET /api/vulnerabilities?workspace_id=<id>
    Returns all vulnerabilities for a workspace, respecting RLS.
    """
    try:
        workspace_id = request.args.get('workspace_id')
        if not workspace_id:
            return jsonify({"error": "workspace_id query param required"}), 400
        
        # RLS is enforced by g.user_client
        vulns_response = g.user_client.table("vulnerabilities") \
            .select("*, assets(hostname, ip_address)") \
            .eq("workspace_id", workspace_id) \
            .order("cvss_score", desc=True) \
            .execute()
        
        vulns = vulns_response.data or []
        
        print(f"[✓] /api/vulnerabilities: Returned {len(vulns)} vulnerabilities for workspace {workspace_id}")
        return jsonify(vulns), 200
        
    except Exception as e:
        print(f"[ERROR] /api/vulnerabilities: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch vulnerabilities", "detail": str(e)}), 500


@app.route('/api/vulnerabilities/top', methods=['GET'])
@auth_required
def get_top_vulnerabilities():
    """
    GET /api/vulnerabilities/top?workspace_id=<id>
    Returns top 5 "open" critical/high vulnerabilities for dashboard.
    """
    try:
        workspace_id = request.args.get('workspace_id')
        if not workspace_id:
            return jsonify({"error": "workspace_id query param required"}), 400
        
        # RLS is enforced by g.user_client
        vulns_response = g.user_client.table("vulnerabilities") \
            .select("*, assets(hostname, ip_address)") \
            .eq("workspace_id", workspace_id) \
            .in_("severity", ["Critical", "High"]) \
            .eq("status", "open") \
            .order("cvss_score", desc=True) \
            .limit(5) \
            .execute()
        
        vulns = vulns_response.data or []
        
        print(f"[✓] /api/vulnerabilities/top: Returned {len(vulns)} top vulnerabilities for workspace {workspace_id}")
        return jsonify(vulns), 200
        
    except Exception as e:
        print(f"[ERROR] /api/vulnerabilities/top: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch top vulnerabilities", "detail": str(e)}), 500


@app.route('/api/assets/vulnerable', methods=['GET'])
@auth_required
def get_vulnerable_assets():
    """
    GET /api/assets/vulnerable?workspace_id=<id>
    Returns top 5 assets with open vulnerabilities, ordered by risk.
    """
    try:
        workspace_id = request.args.get('workspace_id')
        if not workspace_id:
            return jsonify({"error": "workspace_id query param required"}), 400
        
        # RLS is enforced by g.user_client
        # This query fetches assets that have at least one 'open' vulnerability
        # and orders them by their risk_score.
        assets_response = g.user_client.table("assets") \
            .select("*, vulnerabilities!inner(status, severity)") \
            .eq("workspace_id", workspace_id) \
            .eq("vulnerabilities.status", "open") \
            .order("risk_score", desc=True) \
            .limit(5) \
            .execute()

        assets = assets_response.data or []
        
        print(f"[✓] /api/assets/vulnerable: Returned {len(assets)} vulnerable assets for workspace {workspace_id}")
        return jsonify(assets), 200
        
    except Exception as e:
        print(f"[ERROR] /api/assets/vulnerable: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch vulnerable assets", "detail": str(e)}), 500


@app.route('/api/scans/recent', methods=['GET'])
@auth_required
def get_recent_scans():
    """
    GET /api/scans/recent?workspace_id=<id>
    Returns most recent 5 scans for a workspace.
    """
    try:
        workspace_id = request.args.get('workspace_id')
        if not workspace_id:
            return jsonify({"error": "workspace_id query param required"}), 400
        
        # RLS is enforced by g.user_client
        scans_response = g.user_client.table("scans") \
            .select("*") \
            .eq("workspace_id", workspace_id) \
            .order("created_at", desc=True) \
            .limit(5) \
            .execute()
        
        scans = scans_response.data or []
        
        print(f"[✓] /api/scans/recent: Returned {len(scans)} recent scans for workspace {workspace_id}")
        return jsonify(scans), 200
        
    except Exception as e:
        print(f"[ERROR] /api/scans/recent: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch recent scans", "detail": str(e)}), 500

# --- REPORTS ENDPOINT ---
@app.route('/api/reports', methods=['POST'])
@auth_required
def create_report():
    """
    POST /api/reports
    Triggers a Celery task to generate a PDF report for a scan.
    """
    try:
        payload = request.get_json()
        scan_id = payload.get('scan_id')
        
        if not scan_id:
            return jsonify({"error": "scan_id is required"}), 400
        
        # We pass g.user_id so the report can be branded
        # with the consultant's name
        task = generate_report.delay(scan_id, g.user_id)
        
        print(f"[✓] /api/reports: Queued report generation task {task.id} for scan {scan_id}")
        
        return jsonify({
            "message": "Report generation started.",
            "task_id": task.id
        }), 202

    except Exception as e:
        print(f"[ERROR] /api/reports: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Failed to start report generation", "detail": str(e)}), 500
# --- END REPORTS ENDPOINT ---

# --- DOWNLOAD ENDPOINT ---
@app.route('/api/reports/download', methods=['GET'])
@auth_required # Ensures only authenticated users can download
def download_report():
    """
    GET /api/reports/download?filename=...
    Downloads the generated PDF from the container's /tmp directory.
    NOTE: In a production, multi-container setup, this file
    would be retrieved from S3 or a shared volume.
    """
    try:
        filename = request.args.get('filename')
        if not filename:
            return jsonify({"error": "filename is required"}), 400
        
        # Basic security: prevent path traversal
        if ".." in filename or not filename.startswith("report_") or not filename.endswith(".pdf"):
             return jsonify({"error": "Invalid filename"}), 400
        
        # This serves the file from the /tmp directory *inside the api container*
        # This works because the worker and api share the same /tmp
        print(f"[✓] /api/reports/download: User {g.user_id} downloading {filename}")
        return send_from_directory(
            '/tmp', 
            filename, 
            as_attachment=True
        )

    except FileNotFoundError:
        print(f"[ERROR] /api/reports/download: File not found: {filename}")
        return jsonify({"error": "Report file not found. It may have expired or failed to generate."}), 404
    except Exception as e:
        print(f"[ERROR] /api/reports/download: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Failed to download report", "detail": str(e)}), 500
# --- END DOWNLOAD ENDPOINT ---

@app.route('/api/scans/<scan_id>/attack-path', methods=['GET'])
@auth_required
def get_scan_attack_path(scan_id):
    """
    GET /api/scans/<scan_id>/attack-path
    Returns the serialized attack path graph (JSON) for a specific scan.
    RLS is enforced by g.user_client.
    """
    try:
        if not scan_id:
            return jsonify({"error": "scan_id is required"}), 400
        
        # RLS is enforced by g.user_client
        graph_response = g.user_client.table("scans") \
            .select("graph_data") \
            .eq("id", scan_id) \
            .maybe_single() \
            .execute()
        
        if not graph_response.data:
            return jsonify({"error": "Scan not found or access denied"}), 404
        
        graph_data = graph_response.data.get("graph_data")
        
        if not graph_data:
            # This is a valid state; the scan might be old or failed serialization
            print(f"[✓] /api/scans/{scan_id}/attack-path: Scan found, but no graph data available.")
            return jsonify({"error": "Attack path data not yet available for this scan."}), 404

        # --- ADD THIS TYPE SAFETY CHECK ---
        # Ensure graph_data is a dict, not a string (defensive programming)
        if isinstance(graph_data, str):
            try:
                graph_data = json.loads(graph_data)
                print(f"[WARN] /api/scans/{scan_id}/attack-path: Had to parse graph_data from string")
            except json.JSONDecodeError as parse_err:
                print(f"[ERROR] /api/scans/{scan_id}/attack-path: Invalid JSON in graph_data: {parse_err}")
                return jsonify({"error": "Corrupted graph data"}), 500
        # --- END TYPE SAFETY CHECK ---

        print(f"[✓] /api/scans/{scan_id}/attack-path: Returned graph data for user {g.user_id}")
        # The data is already stored as JSON, so just return it
        return jsonify(graph_data), 200
        
    except Exception as e:
        print(f"[ERROR] /api/scans/{scan_id}/attack-path: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch attack path", "detail": str(e)}), 500

# ============================================================================
# 🚀 DEPRECATED ENDPOINTS (To be removed)
# ============================================================================

@app.route('/scan/<scan_id>/complete', methods=['POST'])
def complete_scan(scan_id):
    """
    DEPRECATED: Worker now saves scan results directly via psycopg2.
    This endpoint is no longer used by the frontend (AppLayout.jsx)
    and can be safely removed.
    """
    print(f"[!!!] ========================================")
    print(f"[!!!] DEPRECATED ENDPOINT CALLED: /scan/{scan_id}/complete")
    print(f"[!!!] This endpoint does nothing. Worker handles all saves.")
    print(f"[!!!] ========================================")
    
    return jsonify({
        "status": "deprecated",
        "message": "Worker handles data saves automatically. This endpoint is no longer needed.",
        "scan_id": scan_id
    }), 410 # 410 Gone


# ============================================================================
# APP RUNNER
# ============================================================================

if __name__ == '__main__':
    print("Starting Flask development server...")
    app.run(host='0.0.0.0', port=5000, debug=True)