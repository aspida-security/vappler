// --- FIX: Add the import statement ---
import { supabase } from '../lib/supabase';

export const assetService = {
  async getAssets(workspaceId, filters = {}) {
    try {
      let query = supabase // Now 'supabase' is defined
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
      console.error("[assetService] getAssets failed:", error); // Added console log
      return { data: null, error: error.message };
    }
  },

  async createAsset(assetData) {
    try {
      const { data, error } = await supabase // Now 'supabase' is defined
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
      console.error("[assetService] createAsset failed:", error); // Added console log
      // The error object from the 'throw' above is caught here
      return { data: null, error }; // Return the full error object might be more useful
    }
  },

  async getVulnerableHosts(workspaceId, limit = 10) {
    try {
      const { data, error } = await supabase // Now 'supabase' is defined
        .from('assets')
        .select(`*`)
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .gte('risk_score', 5.0) // Assuming risk_score exists
        .order('risk_score', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("[assetService] getVulnerableHosts failed:", error); // Added console log
      return { data: null, error: error.message };
    }
  },

  async getAsset(id) {
    try {
      const { data, error } = await supabase // Now 'supabase' is defined
        .from('assets')
        // Ensure relation names match your schema if different
        .select(`*, vulnerabilities(id, title, severity, cvss_score, status, discovered_at), workspace:workspace_id(name)`)
        .eq('id', id)
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("[assetService] getAsset failed:", error); // Added console log
      return { data: null, error: error.message };
    }
  },

  async updateAsset(id, updates) {
    try {
      // Ensure 'updated_at' column exists in your assets table
      const { data, error } = await supabase // Now 'supabase' is defined
        .from('assets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("[assetService] updateAsset failed:", error); // Added console log
      return { data: null, error: error.message };
    }
  },

  async deleteAsset(id) { // Soft delete
    try {
      // Ensure 'is_active' column exists
      const { error } = await supabase // Now 'supabase' is defined
        .from('assets')
        .update({ is_active: false, updated_at: new Date().toISOString() }) // Also update timestamp
        .eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("[assetService] deleteAsset (soft) failed:", error); // Added console log
      return { error: error.message };
    }
  },
};