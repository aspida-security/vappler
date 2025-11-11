-- Vappler Database Optimization
-- Creates indexes for query performance

CREATE INDEX IF NOT EXISTS idx_vulnerabilities_workspace_id ON vulnerabilities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_scan_id ON vulnerabilities(scan_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_cvss_score ON vulnerabilities(cvss_score DESC);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_discovered_at ON vulnerabilities(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_workspace_id ON assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_assets_highest_severity ON assets(highest_severity);
CREATE INDEX IF NOT EXISTS idx_assets_ip_address ON assets(ip_address);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_last_scan ON assets(last_scan DESC);
CREATE INDEX IF NOT EXISTS idx_scans_workspace_id ON scans(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_created_by ON scans(created_by);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_composite ON workspace_members(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_workspace_severity ON vulnerabilities(workspace_id, severity);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_workspace_status ON vulnerabilities(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_workspace_severity ON assets(workspace_id, highest_severity);
CREATE INDEX IF NOT EXISTS idx_scans_workspace_status ON scans(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_title_search ON vulnerabilities USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_assets_hostname_search ON assets USING GIN (to_tsvector('english', hostname));
