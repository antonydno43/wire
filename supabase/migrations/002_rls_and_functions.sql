-- ==============================================================================
-- YourBiz CRM — Migration 002: High-Scale RLS Policies, Triggers & RPCs
-- Optimized for zero recursive locks and instant O(log N) tenant isolation
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECURITY DEFINER MEMBERSHIP HELPERS (Avoid recursive RLS evaluation)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(ws_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role = ANY(allowed_roles)
  );
$$;

-- ------------------------------------------------------------------------------
-- 2. SEED DEFAULT PIPELINE STAGES WHENEVER A WORKSPACE IS CREATED
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_default_pipeline_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pipeline_stages (workspace_id, name, position, win_probability, color_hex, is_won, is_lost)
  VALUES
    (NEW.id, 'Lead In',       1,  10, '#64748B', FALSE, FALSE),
    (NEW.id, 'Contacted',     2,  25, '#0284C7', FALSE, FALSE),
    (NEW.id, 'Qualified',     3,  50, '#2563EB', FALSE, FALSE),
    (NEW.id, 'Proposal Sent', 4,  75, '#7C3AED', FALSE, FALSE),
    (NEW.id, 'Negotiation',   5,  90, '#D97706', FALSE, FALSE),
    (NEW.id, 'Closed Won',    6, 100, '#059669', TRUE,  FALSE),
    (NEW.id, 'Closed Lost',   7,   0, '#DC2626', FALSE, TRUE);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_pipeline_stages ON public.workspaces;
CREATE TRIGGER trg_seed_pipeline_stages
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_pipeline_stages();

-- ------------------------------------------------------------------------------
-- 3. AUTOMATIC PROFILE & PERSONAL WORKSPACE CREATION ON USER SIGNUP
-- Every user receives their own personal/business workspace immediately,
-- even if they also accept an invitation to join another team's workspace.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_tz TEXT;
  v_currency TEXT;
  v_country TEXT;
  v_ws_name TEXT;
  v_ws_slug TEXT;
  v_new_ws_id UUID;
BEGIN
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );
  v_tz := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'preferred_timezone'), ''), 'Asia/Kolkata');
  v_currency := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'preferred_currency'), ''), 'INR');
  v_country := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'country_code'), ''), 'IN');
  v_ws_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'workspace_name'), ''),
    v_full_name || '''s Workspace'
  );

  INSERT INTO public.profiles (id, email, full_name, preferred_timezone, preferred_currency)
  VALUES (NEW.id, NEW.email, v_full_name, v_tz, v_currency)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name);

  v_ws_slug := regexp_replace(lower(v_ws_name), '[^a-z0-9]+', '-', 'g');
  v_ws_slug := trim(both '-' from v_ws_slug);
  IF v_ws_slug = '' THEN
    v_ws_slug := 'workspace';
  END IF;
  v_ws_slug := left(v_ws_slug, 40) || '-' || substr(replace(NEW.id::text, '-', ''), 1, 8);

  INSERT INTO public.workspaces (
    name, slug, owner_id, default_currency, default_timezone, country_code
  )
  VALUES (
    v_ws_name, v_ws_slug, NEW.id, v_currency, v_tz, v_country
  )
  RETURNING id INTO v_new_ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_new_ws_id, NEW.id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 4. RPC: CREATE ADDITIONAL WORKSPACE ATOMICALLY
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_workspace_with_defaults(
  ws_name TEXT,
  ws_currency TEXT DEFAULT 'INR',
  ws_timezone TEXT DEFAULT 'Asia/Kolkata',
  ws_country TEXT DEFAULT 'IN',
  ws_tax_id TEXT DEFAULT NULL
)
RETURNS public.workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_slug TEXT;
  v_ws public.workspaces;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF TRIM(COALESCE(ws_name, '')) = '' THEN
    RAISE EXCEPTION 'Workspace name is required';
  END IF;

  v_slug := regexp_replace(lower(TRIM(ws_name)), '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  IF v_slug = '' THEN
    v_slug := 'workspace';
  END IF;
  v_slug := left(v_slug, 40) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  INSERT INTO public.workspaces (
    name, slug, owner_id, default_currency, default_timezone, country_code, gst_or_tax_id
  )
  VALUES (
    TRIM(ws_name), v_slug, v_uid, COALESCE(ws_currency, 'INR'),
    COALESCE(ws_timezone, 'Asia/Kolkata'), COALESCE(ws_country, 'IN'), NULLIF(TRIM(ws_tax_id), '')
  )
  RETURNING * INTO v_ws;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_ws.id, v_uid, 'owner');

  RETURN v_ws;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. RPC: SAFE INVITATION PREVIEW (Callable by unauthenticated invite recipients)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_invitation_preview(invite_token UUID)
RETURNS TABLE (
  workspace_id UUID,
  workspace_name TEXT,
  workspace_currency TEXT,
  workspace_timezone TEXT,
  inviter_name TEXT,
  invited_email TEXT,
  role TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.id AS workspace_id,
    w.name AS workspace_name,
    w.default_currency AS workspace_currency,
    w.default_timezone AS workspace_timezone,
    p.full_name AS inviter_name,
    i.email AS invited_email,
    i.role,
    CASE
      WHEN i.status = 'pending' AND i.expires_at < NOW() THEN 'expired'
      ELSE i.status
    END AS status,
    i.expires_at
  FROM public.workspace_invitations i
  JOIN public.workspaces w ON w.id = i.workspace_id
  JOIN public.profiles p ON p.id = i.invited_by
  WHERE i.token = invite_token
  LIMIT 1;
$$;

-- ------------------------------------------------------------------------------
-- 6. RPC: ACCEPT WORKSPACE INVITATION (Verifies email match + joins workspace)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(invite_token UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_user_email TEXT;
  v_inv public.workspace_invitations;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Please sign in or create an account to accept this invitation.';
  END IF;

  SELECT email INTO v_user_email FROM public.profiles WHERE id = v_uid;
  IF v_user_email IS NULL THEN
    v_user_email := auth.jwt()->>'email';
  END IF;

  SELECT * INTO v_inv
  FROM public.workspace_invitations
  WHERE token = invite_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or invalid link.';
  END IF;

  IF v_inv.status = 'accepted' THEN
    -- Ensure membership exists and return workspace_id idempotently
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_inv.workspace_id, v_uid, v_inv.role)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    RETURN v_inv.workspace_id;
  END IF;

  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'This invitation has been revoked or is no longer active.';
  END IF;

  IF v_inv.expires_at < NOW() THEN
    UPDATE public.workspace_invitations SET status = 'expired' WHERE id = v_inv.id;
    RAISE EXCEPTION 'This invitation has expired. Ask your workspace admin to send a new invite.';
  END IF;

  IF lower(TRIM(v_user_email)) <> lower(TRIM(v_inv.email)) THEN
    RAISE EXCEPTION 'This invitation was sent to %, but you are signed in as %.', v_inv.email, v_user_email;
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_inv.workspace_id, v_uid, v_inv.role)
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.workspace_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = v_inv.id;

  RETURN v_inv.workspace_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_queries ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 8. RLS POLICIES
-- ------------------------------------------------------------------------------

-- PROFILES: Read own profile OR fellow workspace members; update only self
DROP POLICY IF EXISTS "profiles_select_self_or_teammates" ON public.profiles;
CREATE POLICY "profiles_select_self_or_teammates" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.workspace_members wm_self
      JOIN public.workspace_members wm_other ON wm_self.workspace_id = wm_other.workspace_id
      WHERE wm_self.user_id = auth.uid()
        AND wm_other.user_id = public.profiles.id
    )
  );

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- WORKSPACES: Read if member/owner; update if owner/admin; delete if owner
DROP POLICY IF EXISTS "workspaces_select_member" ON public.workspaces;
CREATE POLICY "workspaces_select_member" ON public.workspaces
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_workspace_member(id));

DROP POLICY IF EXISTS "workspaces_insert_authenticated" ON public.workspaces;
CREATE POLICY "workspaces_insert_authenticated" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "workspaces_update_admin" ON public.workspaces;
CREATE POLICY "workspaces_update_admin" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_workspace_role(id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "workspaces_delete_owner" ON public.workspaces;
CREATE POLICY "workspaces_delete_owner" ON public.workspaces
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- WORKSPACE MEMBERS: Read fellow members; owner/admin can update/remove (never remove last owner)
DROP POLICY IF EXISTS "ws_members_select" ON public.workspace_members;
CREATE POLICY "ws_members_select" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "ws_members_insert_admin" ON public.workspace_members;
CREATE POLICY "ws_members_insert_admin" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_workspace_role(workspace_id, ARRAY['owner', 'admin'])
    OR (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.id = workspace_id AND w.owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "ws_members_update_admin" ON public.workspace_members;
CREATE POLICY "ws_members_update_admin" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "ws_members_delete_admin_or_self" ON public.workspace_members;
CREATE POLICY "ws_members_delete_admin_or_self" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (
    (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']) AND role <> 'owner')
    OR (user_id = auth.uid() AND role <> 'owner')
  );

-- WORKSPACE INVITATIONS: Admins/owners/managers can view & manage; invitees can see their own pending invites
DROP POLICY IF EXISTS "ws_invites_select" ON public.workspace_invitations;
CREATE POLICY "ws_invites_select" ON public.workspace_invitations
  FOR SELECT TO authenticated
  USING (
    public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager'])
    OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
  );

DROP POLICY IF EXISTS "ws_invites_insert" ON public.workspace_invitations;
CREATE POLICY "ws_invites_insert" ON public.workspace_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager'])
  );

DROP POLICY IF EXISTS "ws_invites_update" ON public.workspace_invitations;
CREATE POLICY "ws_invites_update" ON public.workspace_invitations
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']));

DROP POLICY IF EXISTS "ws_invites_delete" ON public.workspace_invitations;
CREATE POLICY "ws_invites_delete" ON public.workspace_invitations
  FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- PIPELINE STAGES
DROP POLICY IF EXISTS "stages_select" ON public.pipeline_stages;
CREATE POLICY "stages_select" ON public.pipeline_stages
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "stages_write_admin" ON public.pipeline_stages;
CREATE POLICY "stages_write_admin" ON public.pipeline_stages
  FOR ALL TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager']));

-- STANDARD WORKSPACE-SCOPED CRM DATA POLICIES (Companies, Contacts, Deals, Tasks, Activities, Products, Invoices)
-- Members (owner, admin, manager, member) can read/insert/update; Viewers can read only; Deletes require owner/admin/manager or creator
DO $$
DECLARE
  crm_tbl TEXT;
BEGIN
  FOREACH crm_tbl IN ARRAY ARRAY[
    'companies', 'contacts', 'deals', 'tasks', 'products', 'invoices_quotes'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%I_select" ON public.%I;', crm_tbl, crm_tbl);
    EXECUTE format(
      'CREATE POLICY "%I_select" ON public.%I FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));',
      crm_tbl, crm_tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS "%I_insert" ON public.%I;', crm_tbl, crm_tbl);
    EXECUTE format(
      'CREATE POLICY "%I_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_workspace_role(workspace_id, ARRAY[''owner'', ''admin'', ''manager'', ''member'']));',
      crm_tbl, crm_tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS "%I_update" ON public.%I;', crm_tbl, crm_tbl);
    EXECUTE format(
      'CREATE POLICY "%I_update" ON public.%I FOR UPDATE TO authenticated USING (public.has_workspace_role(workspace_id, ARRAY[''owner'', ''admin'', ''manager'', ''member''])) WITH CHECK (public.has_workspace_role(workspace_id, ARRAY[''owner'', ''admin'', ''manager'', ''member'']));',
      crm_tbl, crm_tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS "%I_delete" ON public.%I;', crm_tbl, crm_tbl);
    EXECUTE format(
      'CREATE POLICY "%I_delete" ON public.%I FOR DELETE TO authenticated USING (public.has_workspace_role(workspace_id, ARRAY[''owner'', ''admin'', ''manager'']));',
      crm_tbl, crm_tbl
    );
  END LOOP;
END $$;

-- ACTIVITIES (Immutable audit log for non-admins; members can insert notes/calls/emails)
DROP POLICY IF EXISTS "activities_select" ON public.activities;
CREATE POLICY "activities_select" ON public.activities
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "activities_insert" ON public.activities;
CREATE POLICY "activities_insert" ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'manager', 'member']));

DROP POLICY IF EXISTS "activities_delete" ON public.activities;
CREATE POLICY "activities_delete" ON public.activities
  FOR DELETE TO authenticated
  USING (
    actor_id = auth.uid()
    OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin'])
  );

-- SUPPORT QUERIES (Public submission allowed; read restricted to submitting user)
DROP POLICY IF EXISTS "support_queries_insert_public" ON public.support_queries;
CREATE POLICY "support_queries_insert_public" ON public.support_queries
  FOR INSERT TO anon, authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "support_queries_select_own" ON public.support_queries;
CREATE POLICY "support_queries_select_own" ON public.support_queries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Grant execute on RPCs
GRANT EXECUTE ON FUNCTION public.create_workspace_with_defaults(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_preview(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(UUID) TO authenticated;
