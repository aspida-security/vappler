#!/usr/bin/env python3
"""
Celery Tasks for Vappler Security Scanner
Handles asynchronous vulnerability scanning and attack path analysis
"""

import requests, os, traceback, psycopg2, json, datetime
import psycopg2.extras
import networkx as nx
from celery import Celery
from scanner.mapper import NetworkMapper
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

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

DATABASE_URL = os.environ.get("DATABASE_URL")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# --- Setup Jinja2 templating ---
template_env = Environment(loader=FileSystemLoader('app/templates'))



def update_scan_status(scan_id, status, error_message=None, graph_data=None): # <-- MODIFIED
    """Update scan record status in Supabase via PostgREST (requests is fine for this)"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print(f"[WARN] Cannot update scan status: Missing Supabase config")
        return
    
    url = f"{SUPABASE_URL}/rest/v1/scans?id=eq.{scan_id}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json"
    }
    
    update_data = {"status": status}
    if error_message:
        update_data["description"] = f"Error: {error_message}"
    
    # --- ADDED THIS BLOCK ---
    if graph_data:
        # graph_data is already a dict; requests.json will serialize it correctly
        update_data["graph_data"] = graph_data
    # --- END ADDED BLOCK ---

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


# ... (map_severity function remains the same) ...
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

        # ... (Database save logic using psycopg2 remains exactly the same) ...
        
        assets_saved = 0
        vulns_saved = 0
        host_list = result.get("vulnerability_details", [])
        if not host_list:
             print("[!] Mapper returned no vulnerability details. Nothing to save.")

        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        for host_data in host_list:
            try:
                asset_payload = (
                    workspace_id,
                    host_data.get("ip_address"),
                    host_data.get("host"),
                    True, # is_active
                    "now()" # last_scan_at
                )
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
                asset_id = cursor.fetchone()[0]
                assets_saved += 1
                
                vuln_list = host_data.get("vulnerabilities", [])
                if not vuln_list:
                    continue 

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
                conn.rollback()
                print(f"[!!!] Failed to save data for host {host_data.get('ip_address')}: {save_err}")
                traceback.print_exc()
            else:
                conn.commit()

        print(f"[✓] Saved {assets_saved} assets and {vulns_saved} vulnerabilities")

        # --- ADDED THIS BLOCK ---
        # After saving, serialize the graph and update the scan record
        graph_json = None
        try:
            graph_data_dict = nx.node_link_data(mapper.graph)  # Already a dict
            print(f"[*] Serialized attack path graph for scan {scan_id}")
        except Exception as graph_err:
            print(f"[WARN] Could not serialize graph for scan {scan_id}: {graph_err}")
            graph_data_dict = None

        # Pass dict directly, not JSON string
        update_scan_status(scan_id, "completed", graph_data=graph_data_dict)
        # --- END ADDED BLOCK ---
        
        return {
            "scan_id": scan_id,
            "assets_saved": assets_saved,
            "vulnerabilities_saved": vulns_saved,
            "status": "completed",
            "vulnerability_details": result.get("vulnerability_details", [])
        }
    
    except Exception as e:
        if conn:
            conn.rollback() 
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

# --- REPORT GENERATION TASK ---
@celery_app.task(bind=True, max_retries=1)
def generate_report(self, scan_id, user_id):
    """
    Generate PDF/HTML report for a completed scan
    """
    print(f"[*] Report task started for scan {scan_id} by user {user_id}")
    if not DATABASE_URL:
        raise Exception("Worker missing DATABASE_URL environment variable.")
    
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # ===== OPTIMIZATION - REPORT CACHING =====
        # Check if report already exists (caching optimization)
        pdf_filename = f"report_{scan_id}.pdf"
        pdf_path = f"/tmp/{pdf_filename}"
        
        if os.path.exists(pdf_path):
            print(f"[*] Report already exists, skipping regeneration: {pdf_path}")
            return {
                "scan_id": scan_id,
                "status": "report_exists",
                "report_path": pdf_path,
                "report_filename": pdf_filename,
                "cached": True  # Flag to indicate this was cached
            }
        # ===== END REPORT CACHING =====

        # Progress updates
        self.update_state(state='PROGRESS', meta={'step': 'Fetching scan data', 'progress': 25})
        # ... fetch scan data ...
        # 1. Fetch Scan and Workspace data
        cursor.execute(
            """
            SELECT s.id, s.name, s.graph_data, w.name as workspace_name
            FROM public.scans s
            JOIN public.workspaces w ON s.workspace_id = w.id
            WHERE s.id = %s;
            """, (scan_id,)
        )
        scan = cursor.fetchone()
        if not scan:
            raise Exception("Scan not found or access denied.")

        # 2. Fetch User data for branding
        cursor.execute(
            "SELECT full_name, email FROM public.user_profiles WHERE id = %s;", (user_id,)
        )
        user = cursor.fetchone()

        # Provide fallback values if user not found
        consultant_name = user['full_name'] if user else "Vappler by Aspida Security Team"
        consultant_email = user['email'] if user else "admin@aspidasecurity.io"
        
        # Progress updates
        self.update_state(state='PROGRESS', meta={'step': 'Calculating attack path', 'progress': 50})
        # ... calculate path ...
        # 3. Parse Graph to find attack path
        if not scan['graph_data']:
            raise Exception("Scan has no attack path graph data to report.")
            
        graph_dict = json.loads(scan['graph_data']) if isinstance(scan['graph_data'], str) else scan['graph_data']
        G = nx.node_link_graph(graph_dict)
        
        # Find nodes in graph (all are assets - no 'attacker' node exists)
        nodes = list(G.nodes())
        if not nodes:
            raise Exception("Graph contains no nodes.")

        # For MVP: Build attack path from all discovered assets
        # Sort nodes by risk_weight if available (highest risk first)
        # If no risk_weight, sort by degree centrality (most connected first)
        real_nodes = [n for n in nodes if n != 'attacker']

        if not real_nodes:
            raise Exception("No real asset nodes found in graph (only 'attacker' node present).")

        # Sort nodes by risk_weight if available (highest risk first)
        try:
            sorted_nodes = sorted(real_nodes, key=lambda n: G.nodes[n].get('risk_weight', 0), reverse=True)
        except:
            centrality = nx.degree_centrality(G)
            sorted_nodes = sorted(real_nodes, key=lambda n: centrality.get(n, 0), reverse=True)

        target_node = sorted_nodes[0]
        path_nodes = [str(node) for node in sorted_nodes]  # Only real IPs now

        print(f"[*] Attack path target (highest priority): {target_node}")
        print(f"[*] Full attack path: {' → '.join(path_nodes)}")

        # 4. Fetch vulnerabilities *only* on the attack path
        # Match by IP address only (more reliable):
        cursor.execute(
            """
            SELECT v.title, v.severity, v.cvss_score, v.description, v.port, v.service, 
                a.hostname, a.ip_address
            FROM public.vulnerabilities v
            JOIN public.assets a ON v.asset_id = a.id
            WHERE a.ip_address::text = ANY(%s)
            ORDER BY v.cvss_score DESC;
            """, (path_nodes,)
        )
        vulnerabilities = [dict(row) for row in cursor.fetchall()]

        # 5. Prepare template context
        context = {
            "report_title": f"Security Assessment for {scan['workspace_name']}",
            "scan_name": scan['name'],
            "scan_id": str(scan_id),
            "report_date": datetime.datetime.now().strftime("%B %d, %Y"),
            "consultant_name": consultant_name,      
            "consultant_email": consultant_email,    
            "attack_path": " → ".join(path_nodes),
            "critical_vulns": [v for v in vulnerabilities if v['severity'] == 'Critical'],
            "high_vulns": [v for v in vulnerabilities if v['severity'] == 'High'],
            "medium_vulns": [v for v in vulnerabilities if v['severity'] == 'Medium'],
            "low_vulns": [v for v in vulnerabilities if v['severity'] == 'Low'],
            "total_vulns": len(vulnerabilities),
            "asset_count": len(path_nodes)
        }

        # 6. Load template and render HTML
        # NOTE: This requires a 'report_template.html' file in the root directory
        try:
            template = template_env.get_template('report_template.html')
            html_out = template.render(context)
        except Exception as template_err:
            print(f"[!!!] Report Error: Failed to load or render 'report_template.html': {template_err}")
            raise Exception(f"Missing or invalid report template: {template_err}")

        # Progress updates
        self.update_state(state='PROGRESS', meta={'step': 'Rendering PDF', 'progress': 75})
        # ... generate PDF ...
        # 7. Convert HTML to PDF
        # We save to a tmp directory; in production, this would go to S3.
        # For the MVP, we'll save it locally in the container.
        pdf_filename = f"report_{scan_id}.pdf"
        pdf_path = f"/tmp/{pdf_filename}" # Save inside the container's /tmp dir
        
        HTML(string=html_out).write_pdf(pdf_path)

        print(f"[✓] Report generated successfully: {pdf_path}")
        
        # Return final result with all details
        return {
            "status": "completed",
            "progress": 100,
            "scan_id": scan_id,
            "report_path": pdf_path,
            "report_filename": pdf_filename
        }

    except Exception as e:
        if conn:
            conn.rollback()
        error_str = str(e)
        print(f"[ERROR] Report generation for {scan_id} failed: {error_str}")
        print(traceback.format_exc())
        raise self.retry(exc=e)
    finally:
        if conn:
            cursor.close()
            conn.close()
# --- END TASK ---

@celery_app.task
def cleanup_old_scans():
    """Clean up old scan records (runs periodically)"""
    print("[*] Running cleanup task...")
    # TODO: Implement cleanup logic
    return {"status": "cleanup_complete"}

@celery_app.task
def cleanup_old_reports():
    """Delete reports older than 7 days"""
    import glob
    import time
    
    cutoff_time = time.time() - (7 * 24 * 60 * 60)  # 7 days ago
    
    for report_file in glob.glob("/tmp/report_*.pdf"):
        if os.path.getmtime(report_file) < cutoff_time:
            os.remove(report_file)
            print(f"[*] Deleted old report: {report_file}")
    
    return {"status": "cleanup_complete"}