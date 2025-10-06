from flask import Flask, request, jsonify
from tasks import run_local_nmap_task, run_hackertarget_task

app = Flask(__name__)

@app.route('/scan', methods=['POST'])
def start_scan():
    data = request.get_json()
    target = data.get('target')
    crown_jewel_asset = data.get('crown_jewel')
    # This is the key: it defaults to 'local' if no scan_type is provided.
    scan_type = data.get('scan_type', 'local')

    if not target or not crown_jewel_asset:
        return jsonify({"error": "'target' and 'crown_jewel' are required."}), 400

    if scan_type == 'local':
        task = run_local_nmap_task.delay(target, crown_jewel_asset)
    elif scan_type == 'external':
        task = run_hackertarget_task.delay(target, crown_jewel_asset)
    else:
        return jsonify({"error": "Invalid scan_type. Must be 'local' or 'external'."}), 400

    return jsonify({"task_id": task.id}), 202

# The /results/<task_id> endpoint remains exactly the same
@app.route('/results/<task_id>', methods=['GET'])
def get_results(task_id):
    task = run_local_nmap_task.AsyncResult(task_id)
    if task.state == 'PENDING':
        response = {'state': task.state, 'status': 'Pending...'}
    elif task.state == 'SUCCESS':
        response = {'state': task.state, 'result': task.result}
    else:
        response = {'state': task.state, 'status': str(task.info)}
    return jsonify(response)