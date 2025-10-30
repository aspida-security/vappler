// src/services/workspaceService.js
import { supabase } from '../lib/supabase';

export const workspaceService = {
  async getWorkspaces() {
    try {
      // --- VULCAN CHANGE: Temporarily remove assets(count) to avoid schema error ---
      // Original: .select(`*, assets(count)`)
      const { data, error } = await supabase
        .from('workspaces')
        .select(`*`) // Fetch only workspace columns for now
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      // --- END VULCAN CHANGE ---

      if (error) throw error;

      // --- VULCAN CHANGE: Add placeholder for asset count since it's not fetched ---
      const dataWithPlaceholder = data?.map(ws => ({ ...ws, assets: [{ count: 0 }] })) || [];
      // --- END VULCAN CHANGE ---

      return { data: dataWithPlaceholder, error: null }; // Return data with placeholder

    } catch (error) {
       console.error("[workspaceService] Error in getWorkspaces:", error); // Added logging
      // --- VULCAN CHANGE: Pass a more specific error message back ---\
      return { data: null, error: `Database query failed: ${error.message}` };
      // --- END VULCAN CHANGE ---
    }
  },

  async getWorkspace(id) {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select(`*, owner:owner_id(full_name, email)`)
        .eq('id', id)
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error(`[workspaceService] Error in getWorkspace(${id}):`, error); // Added logging
      return { data: null, error: `Database query failed: ${error.message}` };
    }
  },

  async getWorkspaceStats(workspaceId) {
    // Check if workspaceId is provided
    if (!workspaceId) {
        console.warn("[workspaceService] getWorkspaceStats called without workspaceId.");
        return { data: null, error: "Workspace ID is required." };
    }
    try {
      // Use count option for potentially better performance and clearer intent
      const { count: assetCount, error: assetError } = await supabase
          .from('assets')
          .select('*', { count: 'exact', head: true }) // head: true fetches only count
          .eq('workspace_id', workspaceId)
          .eq('is_active', true); // Ensure you're counting active assets if needed

      if (assetError) throw new Error(`Asset count failed: ${assetError.message}`);

      // Fetch necessary vulnerability fields
      const { data: vulnerabilities, error: vulnError } = await supabase
          .from('vulnerabilities')
          .select('severity, status, cvss_score') // Select cvss_score here
          .eq('workspace_id', workspaceId);

       if (vulnError) throw new Error(`Vulnerability fetch failed: ${vulnError.message}`);

      // Count active scans
      const { count: activeScanCount, error: scanError } = await supabase
          .from('scans')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .in('status', ['scheduled', 'running']);

      if (scanError) throw new Error(`Scan count failed: ${scanError.message}`);

      // Calculate average risk score directly from fetched vulnerabilities
      const validVulns = vulnerabilities?.filter(v => v.cvss_score !== null) || [];
      const avgRiskScore = validVulns.length > 0
          ? validVulns.reduce((sum, v) => sum + (v.cvss_score || 0), 0) / validVulns.length
          : 0;

      // Calculate stats based on fetched data
      const stats = {
        totalAssets: assetCount ?? 0,
        totalVulnerabilities: vulnerabilities?.length ?? 0,
        criticalVulns: vulnerabilities?.filter(v => v.severity === 'Critical')?.length ?? 0,
        highVulns: vulnerabilities?.filter(v => v.severity === 'High')?.length ?? 0,
        openVulns: vulnerabilities?.filter(v => v.status === 'open')?.length ?? 0,
        activeScans: activeScanCount ?? 0,
        // Round risk score to one decimal place
        riskScore: Math.round(avgRiskScore * 10) / 10
      };
      return { data: stats, error: null };
    } catch (error) {
      console.error(`[workspaceService] Error in getWorkspaceStats(${workspaceId}):`, error); // Added logging
      return { data: null, error: `Failed to get stats: ${error.message}` };
    }
  },

  // --- VULCAN FIX: Implement createWorkspace to handle RLS setup (STEP 1) ---
  async createWorkspace(workspaceData) {
    try {
      // 1. Create the workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert([{
            name: workspaceData.name,
            owner_id: workspaceData.owner_id,
            client_name: workspaceData.client_name,
            created_at: new Date().toISOString(),
            is_active: true
        }])
        .select()
        .single();

      if (workspaceError) {
        console.error("[workspaceService] Workspace creation failed:", workspaceError);
        throw workspaceError;
      }

      // 2. Add the owner as a workspace user/admin for RLS compliance
      const { error: userError } = await supabase
        .from('workspace_users')
        .insert([{
            workspace_id: workspace.id,
            user_id: workspace.owner_id,
            role: 'admin',
            can_scan: true,
            can_export: true,
        }]);
      
      if (userError) {
        // Log the user addition error but proceed with the workspace creation success
        console.warn("[workspaceService] Failed to add owner to workspace_users:", userError.message);
      }

      return { data: workspace, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  // --- END VULCAN FIX ---


  async updateWorkspace(id, updates) { /* ... */ },
  async deleteWorkspace(id) { /* ... */ },
  async addUserToWorkspace(workspaceId, userId, role, permissions) { /* ... */ },
  async removeUserFromWorkspace(workspaceId, userId) { /* ... */ }
};