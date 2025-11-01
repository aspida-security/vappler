-- Fix infinite recursion in workspace RLS policies
-- This migration uses SECURITY DEFINER functions to break the circular dependency

-- 1. Create helper function to check workspace membership (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_is_workspace_member(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.workspace_users 
    WHERE workspace_id = workspace_uuid 
      AND user_id = user_uuid
  );
$$;

-- 2. Create helper function to check workspace ownership
CREATE OR REPLACE FUNCTION public.user_owns_workspace(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.workspaces 
    WHERE id = workspace_uuid 
      AND owner_id = user_uuid
  );
$$;

-- 3. DROP existing problematic policies
DROP POLICY IF EXISTS "workspace_members_can_view_workspace" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_owners_manage_users" ON public.workspace_users;

-- 4. CREATE new policies using SECURITY DEFINER functions (no recursion)
CREATE POLICY "workspace_members_can_view_workspace_v2"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid() 
  OR public.user_is_workspace_member(id, auth.uid())
);

CREATE POLICY "workspace_owners_manage_users_v2"
ON public.workspace_users
FOR ALL
TO authenticated
USING (
  public.user_owns_workspace(workspace_id, auth.uid())
  OR user_id = auth.uid()
)
WITH CHECK (
  public.user_owns_workspace(workspace_id, auth.uid())
);

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_is_workspace_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_workspace(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.user_is_workspace_member IS 'Check if user is member of workspace (bypasses RLS to prevent recursion)';
COMMENT ON FUNCTION public.user_owns_workspace IS 'Check if user owns workspace (bypasses RLS to prevent recursion)';
