import { supabase } from '../lib/supabase';

export const workspaceService = {
  async getWorkspaces() {
    try {
      // --- VULCAN FIX: Fetch the count of related assets for each workspace ---
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          *,
          assets(count)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
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
      return { data: null, error: error.message };
    }
  },

  async getWorkspaceStats(workspaceId) {
    try {
      // *** VULCAN FIX: Corrected 'status', 'active' to use the proper boolean column 'is_active', 'true' ***
      const { count: assetCount } = await supabase.from('assets').select('*', { count: 'exact' }).eq('workspace_id', workspaceId).eq('is_active', true);
      
      const { data: vulnerabilities } = await supabase.from('vulnerabilities').select('severity, status').eq('workspace_id', workspaceId);
      const { count: activeScanCount } = await supabase.from('scans').select('*', { count: 'exact' }).eq('workspace_id', workspaceId).in('status', ['scheduled', 'running']);
      const { data: topVulns } = await supabase.from('vulnerabilities').select('cvss_score').eq('workspace_id', workspaceId).not('cvss_score', 'is', null).order('cvss_score', { ascending: false }).limit(10);
      const avgRiskScore = topVulns?.length > 0 ? topVulns.reduce((sum, v) => sum + (v.cvss_score || 0), 0) / topVulns.length : 0;
      const stats = {
        totalAssets: assetCount || 0,
        totalVulnerabilities: vulnerabilities?.length || 0,
        criticalVulns: vulnerabilities?.filter(v => v.severity === 'Critical')?.length || 0,
        highVulns: vulnerabilities?.filter(v => v.severity === 'High')?.length || 0,
        openVulns: vulnerabilities?.filter(v => v.status === 'open')?.length || 0,
        activeScans: activeScanCount || 0,
        riskScore: Math.round(avgRiskScore * 10) / 10
      };
      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  // The rest of the functions remain the same
  async createWorkspace(workspaceData) { /* ... */ },
  async updateWorkspace(id, updates) { /* ... */ },
  async deleteWorkspace(id) { /* ... */ },
  async addUserToWorkspace(workspaceId, userId, role, permissions) { /* ... */ },
  async removeUserFromWorkspace(workspaceId, userId) { /* ... */ }
};