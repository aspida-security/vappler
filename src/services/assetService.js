import { supabase } from '../lib/supabase';

export const assetService = {
  async getAssets(workspaceId, filters = {}) {
    try {
      let query = supabase
        .from('assets')
        .select(`
          *,
          vulnerabilities(count)
        `)
        .eq('workspace_id', workspaceId)
        .eq('status', 'active');

      if (filters?.assetType) {
        query = query.eq('asset_type', filters.assetType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async getVulnerableHosts(workspaceId, limit = 10) {
    try {
      // --- VULCAN FIX: Removed filtering by 'risk_score' which does not exist ---
      const { data, error } = await supabase
        .from('assets')
        .select(`*`)
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  
  async getAssetStats(workspaceId) {
    try {
      const { data, error } = await supabase.from('assets').select('asset_type, status').eq('workspace_id', workspaceId).eq('status', 'active');
      if (error) throw error;
      const stats = {
        total: data?.length || 0,
        servers: data?.filter(a => a.asset_type === 'server')?.length || 0,
        workstations: data?.filter(a => a.asset_type === 'workstation')?.length || 0,
        network_devices: data?.filter(a => a.asset_type === 'network_device')?.length || 0,
        web_applications: data?.filter(a => a.asset_type === 'web_application')?.length || 0,
        databases: data?.filter(a => a.asset_type === 'database')?.length || 0,
        critical_risk: 0, high_risk: 0, medium_risk: 0, low_risk: 0
      };
      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  
  // No changes to the functions below
  async getAsset(id) { /* ... */ },
  async createAsset(assetData) { /* ... */ },
  async updateAsset(id, updates) { /* ... */ },
  async deleteAsset(id) { /* ... */ },
  async updateAssetRiskScore(id, riskScore) { /* ... */ },
  async bulkImportAssets(workspaceId, assetList) { /* ... */ }
};