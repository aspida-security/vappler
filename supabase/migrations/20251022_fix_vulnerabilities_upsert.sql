-- Location: supabase/migrations/20251022_fix_vulnerabilities_upsert.sql

-- 1. Drop the single, problematic constraint from the initial schema
ALTER TABLE public.vulnerabilities
DROP CONSTRAINT IF EXISTS vulnerabilities_logical_key;

-- 2. Create the UNIQUE index for port-specific vulnerabilities (port IS NOT NULL)
-- This enforces uniqueness on (asset_id, title, port).
CREATE UNIQUE INDEX unique_vulnerability_on_port
ON public.vulnerabilities (asset_id, title, port)
WHERE port IS NOT NULL;

-- 3. Create the PARTIAL UNIQUE index for asset-level vulnerabilities (port IS NULL)
-- This enforces uniqueness on (asset_id, title) when port is NULL.
CREATE UNIQUE INDEX unique_vulnerability_on_asset_level
ON public.vulnerabilities (asset_id, title)
WHERE port IS NULL;