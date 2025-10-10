from celery import Celery
from scanner.mapper import NetworkMapper

celery_app = Celery('tasks', broker='redis://vulcan-redis:6379/0', backend='redis://vulcan-redis:6379/0')

@celery_app.task
def run_local_nmap_task(target, crown_jewel_asset):
    print(f"[*] Celery worker starting new LOCAL Nmap task for: {target}")
    # The mapper now handles the entire process in one call
    report = NetworkMapper().scan_and_report(target, crown_jewel_asset)
    print(f"[*] Celery worker finished LOCAL Nmap task for: {target}")
    return report

# We will leave the hackertarget task for now
@celery_app.task
def run_hackertarget_task(target, crown_jewel_asset):
    # ... (this function remains unchanged)
    pass