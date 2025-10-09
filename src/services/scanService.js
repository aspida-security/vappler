import { supabase } from '../lib/supabase';

export const scanService = {
  async getScans(workspaceId, filters = {}) {
    try {
      let query = supabase.from('scans').select(`*, created_by:created_by(full_name, email)`).eq('workspace_id', workspaceId).order('created_at', { ascending: false });
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.scan_type) {
        query = query.eq('scan_type', filters.scan_type);
      }
      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  async getRecentScans(workspaceId, limit = 10) {
    try {
      const { data, error } = await supabase.from('scans').select(`*`).eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  async getScanStats(workspaceId) {
    try {
      const { data, error } = await supabase.from('scans').select('status, scan_type').eq('workspace_id', workspaceId);
      if (error) throw error;
      const stats = {
        total: data?.length || 0,
        running: data?.filter(s => s.status === 'running')?.length || 0,
        completed: data?.filter(s => s.status === 'completed')?.length || 0,
        failed: data?.filter(s => s.status === 'failed')?.length || 0,
        scheduled: data?.filter(s => s.status === 'scheduled')?.length || 0,
        vulnerability_scans: data?.filter(s => s.scan_type === 'vulnerability_scan')?.length || 0,
        web_app_scans: data?.filter(s => s.scan_type === 'web_app_scan')?.length || 0,
        compliance_scans: data?.filter(s => s.scan_type === 'compliance_scan')?.length || 0
      };
      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  async getScan(id) {
    try {
      const { data, error } = await supabase.from('scans').select(`*, created_by:created_by(full_name, email), workspace:workspace_id(name), vulnerabilities:vulnerabilities(id, title, severity, cvss_score, status)`).eq('id', id).single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  async createScan(scanData) {
    try {
      const { data, error } = await supabase.from('scans').insert([{ ...scanData, status: 'scheduled', created_at: new Date()?.toISOString() }]).select().single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  async updateScanStatus(id, status, progress = null, additionalData = {}) {
    try {
      const updateData = { status, ...additionalData };
      if (progress !== null) {
        updateData.progress = progress;
      }
      if (status === 'running' && !additionalData?.started_at) {
        updateData.started_at = new Date()?.toISOString();
      }
      if (status === 'completed' && !additionalData?.completed_at) {
        updateData.completed_at = new Date()?.toISOString();
        if (additionalData?.started_at) {
          const startTime = new Date(additionalData.started_at);
          const endTime = new Date();
          updateData.duration_minutes = Math.round((endTime - startTime) / 60000);
        }
      }
      const { data, error } = await supabase.from('scans').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  async startScan(id) {
    try {
      const { data, error } = await supabase.from('scans').update({ status: 'running', started_at: new Date()?.toISOString(), progress: 0 }).eq('id', id).select().single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  async cancelScan(id) {
    try {
      const { data, error } = await supabase.from('scans').update({ status: 'cancelled', completed_at: new Date()?.toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },
  async deleteScan(id) {
    try {
      const { error } = await supabase.from('scans').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },
  async getScanResults(scanId) {
    try {
      const { data, error } = await supabase.from('vulnerabilities').select('severity, status').eq('scan_id', scanId);
      if (error) throw error;
      const results = {
        total_vulnerabilities: data?.length || 0,
        critical: data?.filter(v => v.severity === 'Critical')?.length || 0,
        high: data?.filter(v => v.severity === 'High')?.length || 0,
        medium: data?.filter(v => v.severity === 'Medium')?.length || 0,
        low: data?.filter(v => v.severity === 'Low')?.length || 0,
        info: data?.filter(v => v.severity === 'Info')?.length || 0,
        open: data?.filter(v => v.status === 'open')?.length || 0,
        confirmed: data?.filter(v => v.status === 'confirmed')?.length || 0,
        false_positives: data?.filter(v => v.status === 'false_positive')?.length || 0
      };
      return { data: results, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  }
};