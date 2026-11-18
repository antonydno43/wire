-- ==============================================================================
-- YourBiz CRM — Migration 001: Core Multi-Tenant Schema & Scale Indexes
-- Designed for PostgreSQL / Supabase (10B+ row ready UUID + composite B-tree)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Mirrors auth.users with personal timezone & currency preferences)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  job_title TEXT,
  preferred_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  preferred_currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (lower(email));

-- ------------------------------------------------------------------------------
-- 2. WORKSPACES (Multi-tenant organizations; every user owns >= 1 workspace)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  default_currency TEXT NOT NULL DEFAULT 'INR',
  default_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  country_code TEXT NOT NULL DEFAULT 'IN',
  gst_or_tax_id TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan_tier IN ('starter', 'growth', 'scale', 'enterprise')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'annual')),
  seat_limit INTEGER NOT NULL DEFAULT 3,
  contact_limit INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces (owner_id);

-- ------------------------------------------------------------------------------
-- 3. WORKSPACE MEMBERS (Role-Based Access Control + member timezone tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

-- Covering composite indexes for O(log N) RLS index-only scans at massive scale
CREATE INDEX IF NOT EXISTS idx_ws_members_user_ws_role
  ON public.workspace_members (user_id, workspace_id, role);
CREATE INDEX IF NOT EXISTS idx_ws_members_ws_user
  ON public.workspace_members (workspace_id, user_id);

-- ------------------------------------------------------------------------------
-- 4. WORKSPACE INVITATIONS (Tokenized Resend email invite workflow)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invite
  ON public.workspace_invitations (workspace_id, lower(email))
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_ws_invites_token ON public.workspace_invitations (token);
CREATE INDEX IF NOT EXISTS idx_ws_invites_email_lower ON public.workspace_invitations (lower(email));

-- ------------------------------------------------------------------------------
-- 5. PIPELINE STAGES (Customizable per workspace)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  win_probability INTEGER NOT NULL DEFAULT 20 CHECK (win_probability BETWEEN 0 AND 100),
  color_hex TEXT NOT NULL DEFAULT '#2563EB',
  is_won BOOLEAN NOT NULL DEFAULT FALSE,
  is_lost BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_ws_pos
  ON public.pipeline_stages (workspace_id, position ASC);

-- ------------------------------------------------------------------------------
-- 6. COMPANIES (B2B Accounts with GST/Tax & Currency metadata)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  gst_number TEXT,
  annual_revenue NUMERIC(18, 2),
  currency TEXT NOT NULL DEFAULT 'INR',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_ws_created
  ON public.companies (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_ws_name
  ON public.companies (workspace_id, lower(name));

-- ------------------------------------------------------------------------------
-- 7. CONTACTS & LEADS (Lifecycle stages, WhatsApp, timezone-aware)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp_number TEXT,
  job_title TEXT,
  lifecycle_stage TEXT NOT NULL DEFAULT 'lead'
    CHECK (lifecycle_stage IN ('lead', 'mql', 'sql', 'customer', 'evangelist', 'churned')),
  lead_source TEXT DEFAULT 'Direct',
  lead_status TEXT NOT NULL DEFAULT 'new'
    CHECK (lead_status IN ('new', 'contacted', 'qualified', 'unqualified', 'nurturing')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  country TEXT DEFAULT 'India',
  city TEXT,
  notes TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_ws_created
  ON public.contacts (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_ws_email
  ON public.contacts (workspace_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_contacts_ws_stage
  ON public.contacts (workspace_id, lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_contacts_company
  ON public.contacts (company_id);

-- ------------------------------------------------------------------------------
-- 8. DEALS (Multi-currency sales opportunities linked to stages & contacts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  expected_close_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  source TEXT DEFAULT 'Inbound',
  lost_reason TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_ws_stage
  ON public.deals (workspace_id, stage_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_ws_owner
  ON public.deals (workspace_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact
  ON public.deals (contact_id);

-- ------------------------------------------------------------------------------
-- 9. TASKS (UTC-normalized due timestamps with creator timezone context)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'follow_up'
    CHECK (task_type IN ('call', 'email', 'meeting', 'follow_up', 'whatsapp', 'demo')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_at TIMESTAMPTZ,
  creator_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_ws_due
  ON public.tasks (workspace_id, status, due_at ASC);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned
  ON public.tasks (assigned_to, status, due_at ASC);

-- ------------------------------------------------------------------------------
-- 10. ACTIVITIES (Unified CRM timeline for calls, notes, emails, WhatsApp)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL
    CHECK (activity_type IN ('note', 'call', 'email', 'meeting', 'stage_change', 'whatsapp', 'system')),
  subject TEXT NOT NULL,
  body TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_ws_occurred
  ON public.activities (workspace_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_contact
  ON public.activities (contact_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_deal
  ON public.activities (deal_id, occurred_at DESC);

-- ------------------------------------------------------------------------------
-- 11. PRODUCTS & TAX CATALOG (HSN/SAC, GST%, multi-currency pricing)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  hsn_sac_code TEXT,
  unit_price NUMERIC(18, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  billing_frequency TEXT NOT NULL DEFAULT 'one_time'
    CHECK (billing_frequency IN ('one_time', 'monthly', 'quarterly', 'annual')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_ws_active
  ON public.products (workspace_id, is_active, created_at DESC);

-- ------------------------------------------------------------------------------
-- 12. QUOTES & INVOICES (Commercial proposals & GST/tax invoices)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  doc_type TEXT NOT NULL DEFAULT 'quote' CHECK (doc_type IN ('quote', 'invoice')),
  doc_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'paid', 'overdue', 'void')),
  currency TEXT NOT NULL DEFAULT 'INR',
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(18, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  due_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_quotes_ws_created
  ON public.invoices_quotes (workspace_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 13. SUPPORT QUERIES (Public /queries page & in-app support tickets)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  country TEXT,
  timezone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_queries_user
  ON public.support_queries (user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- AUTOMATIC UPDATED_AT TIMESTAMP TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles', 'workspaces', 'companies', 'contacts',
    'deals', 'tasks', 'products', 'invoices_quotes'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;
