import { supabase } from '../lib/supabase';

export const workspaceService = {
  // Get all workspaces for current user
  async getWorkspaces() {
    try {
      const { data, error } = await supabase
        ?.from('workspaces')
        ?.select(`
          *,
          assets:assets(count),
          vulnerabilities:vulnerabilities(count),
          workspace_users:workspace_users(
            user_id,
            role,
            can_scan,
            can_export
          )
        `)
        ?.eq('is_active', true)
        ?.order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error?.message };
    }
  },

  // Get single workspace with detailed info
  async getWorkspace(id) {
    try {
      const { data, error } = await supabase
        ?.from('workspaces')
        ?.select(`
          *,
          owner:owner_id(full_name, email),
          assets:assets(count),
          vulnerabilities:vulnerabilities(count),
          scans:scans(count),
          workspace_users:workspace_users(
            user_id,
            role,
            can_scan,
            can_export,
            user_profiles:user_id(full_name, email)
          )
        `)
        ?.eq('id', id)
        ?.single();
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error?.message };
    }
  },

  // Get workspace statistics
  async getWorkspaceStats(workspaceId) {
    try {
      // Get asset count
      const { count: assetCount } = await supabase
        ?.from('assets')
        ?.select('*', { count: 'exact' })
        ?.eq('workspace_id', workspaceId)
        ?.eq('is_active', true);

      // Get vulnerability counts
      const { data: vulnerabilities } = await supabase
        ?.from('vulnerabilities')
        ?.select('severity, status')
        ?.eq('workspace_id', workspaceId);

      // Get active scan count
      const { count: activeScanCount } = await supabase
        ?.from('scans')
        ?.select('*', { count: 'exact' })
        ?.eq('workspace_id', workspaceId)
        ?.in('status', ['scheduled', 'running']);

      // Calculate risk score (average of top 10 vulnerabilities)
      const { data: topVulns } = await supabase
        ?.from('vulnerabilities')
        ?.select('cvss_score')
        ?.eq('workspace_id', workspaceId)
        ?.not('cvss_score', 'is', null)
        ?.order('cvss_score', { ascending: false })
        ?.limit(10);

      const avgRiskScore = topVulns?.length > 0 
        ? topVulns?.reduce((sum, v) => sum + (v?.cvss_score || 0), 0) / topVulns?.length 
        : 0;

      const stats = {
        totalAssets: assetCount || 0,
        totalVulnerabilities: vulnerabilities?.length || 0,
        criticalVulns: vulnerabilities?.filter(v => v?.severity === 'Critical')?.length || 0,
        highVulns: vulnerabilities?.filter(v => v?.severity === 'High')?.length || 0,
        openVulns: vulnerabilities?.filter(v => v?.status === 'open')?.length || 0,
        activeScans: activeScanCount || 0,
        riskScore: Math.round(avgRiskScore * 10) / 10
      };
      
      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: error?.message };
    }
  },

  // Create new workspace
  async createWorkspace(workspaceData) {
    try {
      const { data, error } = await supabase
        ?.from('workspaces')
        ?.insert([{
          ...workspaceData,
          created_at: new Date()?.toISOString()
        }])
        ?.select()
        ?.single();
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error?.message };
    }
  },

  // Update workspace
  async updateWorkspace(id, updates) {
    try {
      const { data, error } = await supabase
        ?.from('workspaces')
        ?.update({
          ...updates,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', id)
        ?.select()
        ?.single();
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error?.message };
    }
  },

  // Delete workspace
  async deleteWorkspace(id) {
    try {
      const { error } = await supabase
        ?.from('workspaces')
        ?.update({ is_active: false })
        ?.eq('id', id);
      
      if (error) {
        throw error;
      }
      
      return { error: null };
    } catch (error) {
      return { error: error?.message };
    }
  },

  // Add user to workspace
  async addUserToWorkspace(workspaceId, userId, role = 'viewer', permissions = {}) {
    try {
      const { data, error } = await supabase
        ?.from('workspace_users')
        ?.insert([{
          workspace_id: workspaceId,
          user_id: userId,
          role,
          can_scan: permissions?.canScan || false,
          can_export: permissions?.canExport || false
        }])
        ?.select()
        ?.single();
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error?.message };
    }
  },

  // Remove user from workspace
  async removeUserFromWorkspace(workspaceId, userId) {
    try {
      const { error } = await supabase
        ?.from('workspace_users')
        ?.delete()
        ?.eq('workspace_id', workspaceId)
        ?.eq('user_id', userId);
      
      if (error) {
        throw error;
      }
      
      return { error: null };
    } catch (error) {
      return { error: error?.message };
    }
  }
};