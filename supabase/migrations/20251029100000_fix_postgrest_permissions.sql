-- FILE: supabase/migrations/20251029100000_fix_postgrest_permissions.sql

-- Grant usage on custom types to the authenticator role
-- This is required for PostgREST to be able to read RLS policies
-- that reference these types, fixing the PGRST001 error.

GRANT USAGE ON TYPE public.user_role TO authenticator;
GRANT USAGE ON TYPE public.severity_level TO authenticator;
GRANT USAGE ON TYPE public.scan_status TO authenticator;
GRANT USAGE ON TYPE public.vulnerability_status TO authenticator;
GRANT USAGE ON TYPE public.asset_type TO authenticator;

-- Also grant usage on the public schema itself, which is best practice
GRANT USAGE ON SCHEMA public TO authenticator;