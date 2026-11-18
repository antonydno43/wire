export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
export type PlanTier = 'starter' | 'growth' | 'scale' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  job_title?: string | null;
  preferred_timezone: string;
  preferred_currency: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  default_currency: string;
  default_timezone: string;
  country_code: string;
  gst_or_tax_id?: string | null;
  plan_tier: PlanTier;
  billing_cycle: BillingCycle;
  seat_limit: number;
  contact_limit: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMembership {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
  workspace?: Workspace;
  profiles?: Pick<Profile, 'id' | 'email' | 'full_name' | 'preferred_timezone' | 'job_title' | 'avatar_url'>;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: Exclude<WorkspaceRole, 'owner'>;
  invited_by: string;
  token: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  accepted_at?: string | null;
  created_at: string;
  inviter?: Pick<Profile, 'full_name' | 'email'>;
  workspace?: Pick<Workspace, 'id' | 'name' | 'default_timezone' | 'default_currency'>;
}

export interface InvitationPreview {
  workspace_id: string;
  workspace_name: string;
  workspace_currency: string;
  workspace_timezone: string;
  inviter_name: string;
  invited_email: string;
  role: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
}

export interface PipelineStage {
  id: string;
  workspace_id: string;
  name: string;
  position: number;
  win_probability: number;
  color_hex: string;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
}

export interface Company {
  id: string;
  workspace_id: string;
  name: string;
  domain?: string | null;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  gst_number?: string | null;
  annual_revenue?: number | null;
  currency: string;
  timezone: string;
  owner_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type LifecycleStage = 'lead' | 'mql' | 'sql' | 'customer' | 'evangelist' | 'churned';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'nurturing';

export interface Contact {
  id: string;
  workspace_id: string;
  company_id?: string | null;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  job_title?: string | null;
  lifecycle_stage: LifecycleStage;
  lead_source?: string | null;
  lead_status: LeadStatus;
  timezone: string;
  country?: string | null;
  city?: string | null;
  notes?: string | null;
  owner_id?: string | null;
  created_by?: string | null;
  last_contacted_at?: string | null;
  created_at: string;
  updated_at: string;
  company?: Pick<Company, 'id' | 'name'> | null;
  owner?: Pick<Profile, 'id' | 'full_name' | 'email' | 'preferred_timezone'> | null;
}

export type DealPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Deal {
  id: string;
  workspace_id: string;
  company_id?: string | null;
  contact_id?: string | null;
  stage_id: string;
  title: string;
  amount: number;
  currency: string;
  expected_close_date?: string | null;
  priority: DealPriority;
  source?: string | null;
  lost_reason?: string | null;
  owner_id?: string | null;
  created_by?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  company?: Pick<Company, 'id' | 'name'> | null;
  contact?: Pick<Contact, 'id' | 'first_name' | 'last_name' | 'email'> | null;
  owner?: Pick<Profile, 'id' | 'full_name' | 'preferred_timezone'> | null;
}

export type TaskType = 'call' | 'email' | 'meeting' | 'follow_up' | 'whatsapp' | 'demo';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface TaskItem {
  id: string;
  workspace_id: string;
  contact_id?: string | null;
  company_id?: string | null;
  deal_id?: string | null;
  title: string;
  description?: string | null;
  task_type: TaskType;
  priority: 'low' | 'medium' | 'high';
  status: TaskStatus;
  due_at?: string | null;
  creator_timezone: string;
  assigned_to?: string | null;
  created_by?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  contact?: Pick<Contact, 'id' | 'first_name' | 'last_name'> | null;
  deal?: Pick<Deal, 'id' | 'title'> | null;
  assignee?: Pick<Profile, 'id' | 'full_name' | 'preferred_timezone'> | null;
}

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'stage_change' | 'whatsapp' | 'system';

export interface Activity {
  id: string;
  workspace_id: string;
  contact_id?: string | null;
  company_id?: string | null;
  deal_id?: string | null;
  actor_id?: string | null;
  activity_type: ActivityType;
  subject: string;
  body?: string | null;
  occurred_at: string;
  actor_timezone: string;
  created_at: string;
  actor?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
}

export interface Product {
  id: string;
  workspace_id: string;
  name: string;
  sku?: string | null;
  hsn_sac_code?: string | null;
  unit_price: number;
  currency: string;
  tax_rate: number;
  billing_frequency: 'one_time' | 'monthly' | 'quarterly' | 'annual';
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuoteLineItem {
  product_id?: string;
  name: string;
  hsn_sac_code?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export interface InvoiceQuote {
  id: string;
  workspace_id: string;
  deal_id?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  doc_type: 'quote' | 'invoice';
  doc_number: string;
  status: 'draft' | 'sent' | 'accepted' | 'paid' | 'overdue' | 'void';
  currency: string;
  line_items: QuoteLineItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  due_date?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  company?: Pick<Company, 'id' | 'name' | 'gst_number'> | null;
  contact?: Pick<Contact, 'id' | 'first_name' | 'last_name' | 'email'> | null;
}
