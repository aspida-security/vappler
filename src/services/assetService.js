import { supabase } from '../lib/supabase';

export const assetService = {
  async getAssets(workspaceId, filters = {}) {
    try {
      let query = supabase.from('assets').select(`*`).eq('workspace_id', workspaceId).eq('is_active', true).order('risk_score', { ascending: false });
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
      const { data, error } = await supabase.from('assets').select(`*`).eq('workspace_id', workspaceId).eq('is_active', true).gte('risk_score', 5.0).order('risk_score', { ascending: false }).limit(limit);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  async getAssetStats(workspaceId) {
    try {
      const { data, error } = await supabase.from('assets').select('asset_type, risk_score, is_active').eq('workspace_id', workspaceId).eq('is_active', true);
      if (error) throw error;
      const stats = {
        total: data?.length || 0,
        servers: data?.filter(a => a.asset_type === 'server')?.length || 0,
        workstations: data?.filter(a => a.asset_type === 'workstation')?.length || 0,
        network_devices: data?.filter(a => a.asset_type === 'network_device')?.length || 0,
        web_applications: data?.filter(a => a.asset_type === 'web_application')?.length || 0,
        databases: data?.filter(a => a.asset_type === 'database')?.length || 0,
        critical_risk: data?.filter(a => a.risk_score >= 8.0)?.length || 0,
        high_risk: data?.filter(a => a.risk_score >= 6.0 && a.risk_score < 8.0)?.length || 0,
        medium_risk: data?.filter(a => a.risk_score >= 4.0 && a.risk_score < 6.0)?.length || 0,
        low_risk: data?.filter(a => a.risk_score < 4.0)?.length || 0
      };
      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  async getAsset(id) {
    try {
      const { data, error } = await supabase.from('assets').select(`*, vulnerabilities:vulnerabilities(id, title, severity, cvss_score, status, discovered_at), workspace:workspace_id(name)`).eq('id', id).single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  async createAsset(assetData) {
    try {
      const { data, error } = await supabase.from('assets').insert([{ ...assetData, created_at: new Date()?.toISOString() }]).select().single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  async updateAsset(id, updates) {
    try {
      const { data, error } = await supabase.from('assets').update({ ...updates, updated_at: new Date()?.toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  async updateAssetRiskScore(id, riskScore) {
    try {
      const { data, error } = await supabase.from('assets').update({ risk_score: riskScore, updated_at: new Date()?.toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  async deleteAsset(id) {
    try {
      const { error } = await supabase.from('assets').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },
  async bulkImportAssets(workspaceId, assetList) {
    try {
      const assetsToInsert = assetList.map(asset => ({ ...asset, workspace_id: workspaceId, created_at: new Date()?.toISOString() }));
      const { data, error } = await supabase.from('assets').insert(assetsToInsert).select();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  }
};