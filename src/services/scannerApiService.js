// src/services/scannerApiService.js

const API_URL = 'http://127.0.0.1:5000'; // Our Python backend URL

export const scannerApiService = {
  /**
   * Starts a scan by calling the Python backend.
   * @param {string} target The IP address or hostname to scan.
   * @returns {Promise<{task_id: string}>} A promise that resolves to the task ID.
   */
  async startScan(target) {
    const response = await fetch(`${API_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: target,
        crown_jewel: target, // Using target as crown_jewel for simplicity
        scan_type: 'local'   // Explicitly tell the backend to use our self-hosted scanner
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to start scan' }));
      throw new Error(errorData.error);
    }
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