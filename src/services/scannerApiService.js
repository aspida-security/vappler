// FILE: src/services/scannerApiService.js

// Import the Supabase client instance you configured in src/lib/supabase.js
import { supabase } from '../lib/supabase'; //

const API_URL = 'http://127.0.0.1:5000'; // Your Python backend URL

export const scannerApiService = {
  /**
   * Starts a scan by calling the Python backend.
   * Ensures the user's JWT is included for authentication.
   * @param {string} target The IP address or hostname to scan.
   * @param {string} workspaceId The ID of the currently selected workspace.
   * @returns {Promise<{task_id: string}>} A promise that resolves to the task ID.
   */
  async startScan(target, workspaceId) { // Removed userId, backend gets it from JWT
    console.log(`[scannerApiService] Starting scan for target: ${target} in workspace: ${workspaceId}`);
    if (!workspaceId) {
      console.error("[scannerApiService] Error: Workspace ID is required but was not provided.");
      throw new Error("Workspace ID is required to start a scan.");
    }

    // --- VULCAN FIX: Get current session/token ---
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
        console.error("[scannerApiService] Error getting session:", sessionError.message);
        throw new Error(`Authentication error: ${sessionError.message}`);
    }
    if (!session) {
        console.error("[scannerApiService] Error: No active session found. User might be logged out.");
        throw new Error("User not authenticated. Please log in again.");
    }
    const token = session.access_token;
    console.log("[scannerApiService] Retrieved access token successfully.");
    // --- END VULCAN FIX ---

    try {
        const response = await fetch(`${API_URL}/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // --- VULCAN FIX: Add Authorization header ---
            'Authorization': `Bearer ${token}`
            // --- END VULCAN FIX ---
          },
          body: JSON.stringify({
            target: target,
            crown_jewel: target, // Using target as crown_jewel for simplicity
            scan_type: 'local',   // Explicitly use local scanner
            workspace_id: workspaceId // Include workspaceId in the payload
            // 'user_id' is no longer needed here, backend gets it via JWT/auth.uid()
          }),
        });

        console.log(`[scannerApiService] POST /scan response status: ${response.status}`);

        if (!response.ok) {
           // Try to parse error from backend, provide fallback
           let errorData;
           let errorMessage = `Failed to start scan. Server responded with status ${response.status}.`;
           try {
               errorData = await response.json();
               console.error("[scannerApiService] Error response body:", errorData);
               // Use the detailed error from the backend response if available
               errorMessage = errorData.error || `HTTP error ${response.status}: ${JSON.stringify(errorData.detail || 'Unknown server error')}`;
               // If it's the specific RLS error, make it clearer
               if (errorData.detail && errorData.detail.includes("violates row-level security policy")) {
                   errorMessage = `Failed to initialize scan in database: ${errorData.detail}`;
               }
           } catch (parseError) {
               console.error("[scannerApiService] Failed to parse error response JSON:", parseError);
               // Fallback if JSON parsing fails
               const textResponse = await response.text(); // Get raw text
               console.error("[scannerApiService] Raw error response text:", textResponse);
               errorMessage = `Failed to start scan. Server responded with status ${response.status}. Response: ${textResponse}`;
           }
           throw new Error(errorMessage);
        }

        const responseData = await response.json();
        console.log("[scannerApiService] Scan started successfully. Response:", responseData);
        return responseData; // Should contain { task_id: "..." }

    } catch (error) {
        // Catch fetch errors (network issues) or errors thrown above
        console.error("[scannerApiService] Error during startScan fetch:", error);
        // Re-throw the error so the calling component (AppLayout) can handle it
        throw error;
    }
  },

  /**
   * Fetches the status and results of a scan task.
   * @param {string} taskId The ID of the task to check.
   * @returns {Promise<object>} A promise that resolves to the result object.
   */
  async getScanResults(taskId) { //
    console.log(`[scannerApiService] Fetching results for task ID: ${taskId}`);
    try {
        const response = await fetch(`${API_URL}/results/${taskId}`); //
        console.log(`[scannerApiService] GET /results/${taskId} response status: ${response.status}`);

        if (!response.ok) { //
          // Try to parse error, provide fallback
          let errorData;
          let errorMessage = `Failed to fetch results. Server responded with status ${response.status}.`;
           try {
               errorData = await response.json(); //
               console.error("[scannerApiService] Error response body:", errorData);
               errorMessage = errorData.error || `HTTP error ${response.status}: ${JSON.stringify(errorData.detail || 'Unknown server error')}`; //
           } catch (parseError) {
               console.error("[scannerApiService] Failed to parse error response JSON:", parseError);
               const textResponse = await response.text();
               console.error("[scannerApiService] Raw error response text:", textResponse);
               errorMessage = `Failed to fetch results. Server responded with status ${response.status}. Response: ${textResponse}`;
           }
          throw new Error(errorMessage); //
        }
        const responseData = await response.json(); //
        console.log(`[scannerApiService] Results for task ${taskId}:`, responseData);
        return responseData;

    } catch (error) {
        console.error(`[scannerApiService] Error during getScanResults fetch for task ${taskId}:`, error);
        throw error; // Re-throw
    }
  }
};