-- Add unique constraint for 'assets' table
-- This allows ON CONFLICT(workspace_id, ip_address) to work
ALTER TABLE public.assets
ADD CONSTRAINT assets_workspace_id_ip_address_key UNIQUE (workspace_id, ip_address);

-- Add unique constraint for 'vulnerabilities' table
-- This allows ON CONFLICT(asset_id, title, port) to work
ALTER TABLE public.vulnerabilities
ADD CONSTRAINT vulnerabilities_asset_id_title_port_key UNIQUE (asset_id, title, port);