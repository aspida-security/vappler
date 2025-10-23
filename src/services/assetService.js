import { supabase } from '../lib/supabase';

export const assetService = {
  async getAssets(workspaceId, filters = {}) {
    try {
      let query = supabase
        .from('assets')
        .select(`*, vulnerabilities(count)`)
        .eq('workspace_id', workspaceId)
        .eq('is_active', true) 
        .order('risk_score', { ascending: false });
      
      if (filters?.assetType) {
        query = query.eq('asset_type', filters.assetType);
      }
      
      // --- VULCAN FIX: MAPPING PHANTOM 'status' FILTER TO REAL 'is_active' COLUMN ---
      // This handles cases where components (like AssetTable) define a status filter and pass it here.
      if (filters?.status) {
         // Map 'online' status (from the AssetTable options) to is_active=true, or any other status to is_active=false
         const isActiveValue = filters.status === 'online' ? true : false;
         query = query.eq('is_active', isActiveValue);
      }
      // --- END VULCAN FIX ---

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async createAsset(assetData) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .insert(assetData)
        .select()
        .single();

      if (error) {
        // Return the full, detailed error from Supabase
        throw error;
      }
      return { data, error: null };
    } catch (error) {
      // The error object from the 'throw' above is caught here
      return { data: null, error };
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

  async getAsset(id) {
    try {
      const { data, error } = await supabase.from('assets').select(`*, vulnerabilities:vulnerabilities(id, title, severity, cvss_score, status, discovered_at), workspace:workspace_id(name)`).eq('id', id).single();
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
  
  async deleteAsset(id) {
    try {
      const { error } = await supabase.from('assets').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },
};