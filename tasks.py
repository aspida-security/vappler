import requests
from celery import Celery
from scanner.mapper import NetworkMapper

celery_app = Celery('tasks', broker='redis://vulcan-redis:6379/0', backend='redis://vulcan-redis:6379/0')

# TASK 1: THE "FREE TIER" LOCAL SCANNER
@celery_app.task
def run_local_nmap_task(target, crown_jewel_asset):
    print(f"[*] Celery worker starting LOCAL Nmap scan for: {target}")
    
    # --- VULCAN FIX: Correctly instantiate the mapper and call the methods in sequence ---
    # 1. Create the mapper WITH the target
    mapper = NetworkMapper(target_range=target)
    
    # 2. Run the discovery and vulnerability scanning
    mapper.discover_hosts()
    mapper.find_vulnerabilities() 
    
    # 3. Generate the final report
    report = mapper.find_attack_path_for_api(crown_jewel=crown_jewel_asset)
    
    print(f"[*] Celery worker finished LOCAL Nmap scan for: {target}")
    return report

# TASK 2: THE "PRO TIER" EXTERNAL SCANNER
@celery_app.task
def run_hackertarget_task(target, crown_jewel_asset):
    print(f"[*] Celery worker starting EXTERNAL API scan for: {target}")
    api_key = "YOUR_API_KEY_HERE" # This can be added later
    api_url = f"https://api.hackertarget.com/nmap/?q={target}&apikey={api_key}"
    
    try:
        response = requests.get(api_url, timeout=300)
        response.raise_for_status()
        scan_result = response.text
        report = {
            "message": f"External scan completed for {target}",
            "path": ["attacker", target],
            "vulnerability_details": [{"host": target, "vulnerabilities": [{"details": scan_result}]}]
        }
    except requests.exceptions.RequestException as e:
        report = {"error": f"External API call failed: {e}"}

    print(f"[*] Celery worker finished EXTERNAL API scan for: {target}")
    return report