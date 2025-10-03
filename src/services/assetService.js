import { supabase } from '../lib/supabase';

export const assetService = {
  // Get all assets for a workspace
  async getAssets(workspaceId, filters = {}) {
    try {
      let query = supabase
        ?.from('assets')
        ?.select(`
          *,
          vulnerabilities:vulnerabilities(count),
          recent_scan:scans(name, completed_at)
        `)
        ?.eq('workspace_id', workspaceId)
        ?.eq('is_active', true)
        ?.order('risk_score', { ascending: false });

      // Apply filters
      if (filters?.assetType) {
        query = query?.eq('asset_type', filters?.assetType);
      }
      
      if (filters?.riskLevel) {
        switch (filters?.riskLevel) {
          case 'critical':
            query = query?.gte('risk_score', 8.0);
            break;
          case 'high':
            query = query?.gte('risk_score', 6.0)?.lt('risk_score', 8.0);
            break;
          case 'medium':
            query = query?.gte('risk_score', 4.0)?.lt('risk_score', 6.0);
            break;
          case 'low':
            query = query?.lt('risk_score', 4.0);
            break;
        }
      }

      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error?.message };
    }
  },

  // Get vulnerable hosts (assets with high risk scores)
  async getVulnerableHosts(workspaceId, limit = 10) {
    try {
      const { data, error } = await supabase
        ?.from('assets')
        ?.select(`
          *,
          vulnerability_count:vulnerabilities(count)
        `)
        ?.eq('workspace_id', workspaceId)
        ?.eq('is_active', true)
        ?.gte('risk_score', 5.0)
        ?.order('risk_score', { ascending: false })
        ?.limit(limit);
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error?.message };
    }
  },

  // Get asset statistics
  async getAssetStats(workspaceId) {
    try {
      const { data, error } = await supabase
        ?.from('assets')
        ?.select('asset_type, risk_score, is_active')
        ?.eq('workspace_id', workspaceId)
        ?.eq('is_active', true);
      
      if (error) {
        throw error;
      }
      
      const stats = {
        total: data?.length || 0,
        servers: data?.filter(a => a?.asset_type === 'server')?.length || 0,
        workstations: data?.filter(a => a?.asset_type === 'workstation')?.length || 0,
        network_devices: data?.filter(a => a?.asset_type === 'network_device')?.length || 0,
        web_applications: data?.filter(a => a?.asset_type === 'web_application')?.length || 0,
        databases: data?.filter(a => a?.asset_type === 'database')?.length || 0,
        critical_risk: data?.filter(a => a?.risk_score >= 8.0)?.length || 0,
        high_risk: data?.filter(a => a?.risk_score >= 6.0 && a?.risk_score < 8.0)?.length || 0,
        medium_risk: data?.filter(a => a?.risk_score >= 4.0 && a?.risk_score < 6.0)?.length || 0,
        low_risk: data?.filter(a => a?.risk_score < 4.0)?.length || 0
      };
      
      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: error?.message };
    }
  },

  // Get single asset with vulnerabilities
  async getAsset(id) {
    try {
      const { data, error } = await supabase
        ?.from('assets')
        ?.select(`
          *,
          vulnerabilities:vulnerabilities(
            id, title, severity, cvss_score, status, discovered_at
          ),
          workspace:workspace_id(name)
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

  // Create new asset
  async createAsset(assetData) {
    try {
      const { data, error } = await supabase
        ?.from('assets')
        ?.insert([{
          ...assetData,
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

  // Update asset
  async updateAsset(id, updates) {
    try {
      const { data, error } = await supabase
        ?.from('assets')
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

  // Update asset risk score
  async updateAssetRiskScore(id, riskScore) {
    try {
      const { data, error } = await supabase
        ?.from('assets')
        ?.update({
          risk_score: riskScore,
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

  // Delete asset (soft delete)
  async deleteAsset(id) {
    try {
      const { error } = await supabase
        ?.from('assets')
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

  // Bulk import assets
  async bulkImportAssets(workspaceId, assetList) {
    try {
      const assetsToInsert = assetList?.map(asset => ({
        ...asset,
        workspace_id: workspaceId,
        created_at: new Date()?.toISOString()
      }));

      const { data, error } = await supabase
        ?.from('assets')
        ?.insert(assetsToInsert)
        ?.select();
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error?.message };
    }
  }
};