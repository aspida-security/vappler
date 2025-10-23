// scannerApiService.js

const API_URL = 'http://127.0.0.1:5000'; // Final confirmed API host

export const scannerApiService = {
  /**
   * Starts a scan by calling the Python backend.
   * @param {string} target The IP address or hostname to scan.
   * @param {string} workspaceId The ID of the currently selected workspace.
   * @param {string} userId The ID of the authenticated user.
   * @returns {Promise<{task_id: string, scan_id: string}>} A promise that resolves to the task ID and the newly created scan ID.
   */
  async startScan(target, workspaceId, userId) { 
    const response = await fetch(`${API_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: target,
        crown_jewel: target, 
        scan_type: 'local',
        // --- CRUCIAL ADDITIONS FOR API.PY ---
        workspace_id: workspaceId, // Sent to API to create scans record
        user_id: userId,           // Sent to API to link created_by
        // ------------------------------------
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to start scan' }));
      throw new Error(errorData.error);
    }
    // API returns both IDs
    return response.json(); 
  },

  /**
   * Fetches the status and results of a scan task.
   * @param {string} taskId The ID of the task to check.
   * @returns {Promise<object>} A promise that resolves to the result object.
   */
  async getScanResults(taskId) {
    const response = await fetch(`${API_URL}/results/${taskId}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch results' }));
      throw new Error(errorData.error);
    }
    return response.json();
  }
};