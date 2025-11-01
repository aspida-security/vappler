-- Location: supabase/migrations/20250930223618_vulcan_full_schema.sql
-- Integration Type: Complete system schema, functions, RLS, and fixes.

-- 1. Extensions & Types
CREATE TYPE public.user_role AS ENUM ('admin', 'analyst', 'viewer', 'client');
CREATE TYPE public.severity_level AS ENUM ('Critical', 'High', 'Medium', 'Low', 'Info');
CREATE TYPE public.scan_status AS ENUM ('scheduled', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE public.vulnerability_status AS ENUM ('open', 'confirmed', 'false_positive', 'remediated', 'accepted');
CREATE TYPE public.asset_type AS ENUM ('server', 'workstation', 'network_device', 'web_application', 'database', 'mobile_device');

-- 2. Core Tables - User Management
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role public.user_role DEFAULT 'analyst'::public.user_role,
    organization TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Client Workspaces
CREATE TABLE public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    client_name TEXT,
    client_contact_email TEXT,
    client_contact_phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Assets Management
CREATE TABLE public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    hostname TEXT,
    ip_address INET NOT NULL,
    asset_type public.asset_type DEFAULT 'server'::public.asset_type,
    operating_system TEXT,
    os_version TEXT,
    mac_address MACADDR,
    open_ports INTEGER[],
    risk_score DECIMAL(3,1) DEFAULT 0.0,
    is_active BOOLEAN DEFAULT true,
    last_scan_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Scan Management
CREATE TABLE public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    scan_type TEXT DEFAULT 'vulnerability_scan',
    status public.scan_status DEFAULT 'scheduled'::public.scan_status,
    target_count INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Vulnerabilities
CREATE TABLE public.vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
    cve_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    severity public.severity_level DEFAULT 'Medium'::public.severity_level,
    cvss_score DECIMAL(3,1),
    cvss_vector TEXT,
    status public.vulnerability_status DEFAULT 'open'::public.vulnerability_status,
    port INTEGER,
    service TEXT,
    proof_of_concept TEXT,
    remediation_steps TEXT,
    "references" TEXT[],
    discovered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Workspace User Access (Many-to-Many)
CREATE TABLE public.workspace_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'viewer',
    can_scan BOOLEAN DEFAULT false,
    can_export BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, user_id)
);

-- 8. Essential Indexes
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_workspaces_owner_id ON public.workspaces(owner_id);
CREATE INDEX idx_workspaces_active ON public.workspaces(is_active);
CREATE INDEX idx_assets_workspace_id ON public.assets(workspace_id);
CREATE INDEX idx_assets_ip ON public.assets(ip_address);
CREATE INDEX idx_assets_risk_score ON public.assets(risk_score DESC);
CREATE INDEX idx_scans_workspace_id ON public.scans(workspace_id);
CREATE INDEX idx_scans_status ON public.scans(status);
CREATE INDEX idx_vulnerabilities_workspace_id ON public.vulnerabilities(workspace_id);
CREATE INDEX idx_vulnerabilities_asset_id ON public.vulnerabilities(asset_id);
CREATE INDEX idx_vulnerabilities_severity ON public.vulnerabilities(severity);
CREATE INDEX idx_vulnerabilities_status ON public.vulnerabilities(status);
CREATE INDEX idx_workspace_users_workspace_id ON public.workspace_users(workspace_id);
CREATE INDEX idx_workspace_users_user_id ON public.workspace_users(user_id);

-- 9. Functions (MUST BE BEFORE RLS POLICIES)

-- RLS PERFORMANCE FIX: Helper function to efficiently check workspace membership.
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
STABLE -- CRITICAL: Allows the query planner to cache/optimize calls
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND (
        w.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.workspace_users wu
          WHERE wu.workspace_id = w.id AND wu.user_id = auth.uid()
        )
      )
  );
$$;

-- ATOMIC PROVISIONING FIX: Ensures RLS links are created only AFTER email confirmation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    new_workspace_id UUID;
    profile_role public.user_role;
BEGIN
    -- CRITICAL ATOMIC CHECK: Only run AFTER email is confirmed
    IF NEW.email_confirmed_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.email_confirmed_at IS NULL) THEN
    
        -- 1. Insert or Update the user profile
        profile_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'analyst'::public.user_role);

        INSERT INTO public.user_profiles (id, email, full_name, role, organization)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            profile_role,
            COALESCE(NEW.raw_user_meta_data->>'organization', 'Default Client')
        )
        ON CONFLICT (id) DO UPDATE SET
            email = NEW.email,
            updated_at = CURRENT_TIMESTAMP;

        -- 2. Insert a default workspace
        INSERT INTO public.workspaces (name, description, owner_id, client_name)
        VALUES (
            COALESCE(NEW.raw_user_meta_data->>'organization', split_part(NEW.email, '@', 1)) || '''s Workspace',
            'Auto-provisioned workspace for initial vulnerability management.',
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'organization', 'Personal')
        ) RETURNING id INTO new_workspace_id;

        -- 3. ESTABLISH RLS CONTEXT (Unblocks the dashboard immediately)
        INSERT INTO public.workspace_users (workspace_id, user_id, role, can_scan, can_export)
        VALUES (
            new_workspace_id,
            NEW.id,
            'admin', 
            true,
            true
        );
        
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- 10. Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies (Updated to use the efficient helper function)

-- Pattern 1: Core user table (user_profiles) - Simple direct access
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Pattern 2: Simple user ownership for workspaces
CREATE POLICY "users_manage_own_workspaces"
ON public.workspaces
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Workspace access through workspace_users table
CREATE POLICY "workspace_members_can_view_workspace"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_users wu
    WHERE wu.workspace_id = id AND wu.user_id = auth.uid()
  )
);

-- RLS PERFORMANCE FIX: Assets Policy (Simplified and optimized)
DROP POLICY IF EXISTS "workspace_members_manage_assets" ON public.assets;
CREATE POLICY "workspace_members_manage_assets"
ON public.assets
FOR ALL
TO authenticated
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

-- RLS PERFORMANCE FIX: Scans access Policy (Simplified and optimized)
DROP POLICY IF EXISTS "workspace_members_manage_scans" ON public.scans;
CREATE POLICY "workspace_members_manage_scans"
ON public.scans
FOR ALL
TO authenticated
USING (public.is_workspace_member(workspace_id))
WITH CHECK (
  workspace_id IN (
    SELECT w.id FROM public.workspaces w
    WHERE w.owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_users wu
      WHERE wu.workspace_id = w.id AND wu.user_id = auth.uid() AND wu.can_scan = true
    )
  )
);

-- RLS PERFORMANCE FIX: Vulnerabilities access Policy (Simplified and optimized)
DROP POLICY IF EXISTS "workspace_members_manage_vulnerabilities" ON public.vulnerabilities;
CREATE POLICY "workspace_members_manage_vulnerabilities"
ON public.vulnerabilities
FOR ALL
TO authenticated
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

-- Pattern 2: Workspace users - owners and members can manage
CREATE POLICY "workspace_owners_manage_users"
ON public.workspace_users
FOR ALL
TO authenticated
USING (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  )
  OR user_id = auth.uid()
)
WITH CHECK (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  )
);

-- 12. Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- New Trigger: Fires AFTER INSERT OR specifically on UPDATE OF email_confirmed_at
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_vulnerabilities_updated_at
  BEFORE UPDATE ON public.vulnerabilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 13. Mock Data with Complete Auth Users
-- *** REMOVED ALL MOCK DATA TO IMPROVE SYSTEM STABILITY AND ELIMINATE TEST CONFUSION ***