import type { PlanTier } from '../types/crm';

export interface PricingPlan {
  id: PlanTier;
  name: string;
  audience: string;
  monthlyInr: number | null;
  annualInr: number | null;
  monthlyUsd: number | null;
  annualUsd: number | null;
  seatLimitLabel: string;
  contactLimitLabel: string;
  highlight?: boolean;
  features: string[];
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    audience: 'For solo founders & small teams',
    monthlyInr: 0,
    annualInr: 0,
    monthlyUsd: 0,
    annualUsd: 0,
    seatLimitLabel: 'Up to 3 team members',
    contactLimitLabel: '1,000 contacts',
    features: [
      '1 personal or business workspace',
      'Visual Kanban deal pipeline (1 pipeline)',
      'Multi-currency & timezone normalization',
      'Contacts, companies & task reminders',
      'CSV import & export',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    audience: 'For scaling sales teams in India & abroad',
    monthlyInr: 799,
    annualInr: 639,
    monthlyUsd: 12,
    annualUsd: 9,
    seatLimitLabel: 'Up to 25 team members / workspace',
    contactLimitLabel: '25,000 contacts',
    highlight: true,
    features: [
      'Up to 5 workspaces with instant switching',
      'Unlimited custom deal pipelines',
      'GST / HSN / SAC product catalog & quotes',
      'Resend email team invitations',
      'Contact 360 timeline & WhatsApp links',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    audience: 'For multi-region revenue operations',
    monthlyInr: 1999,
    annualInr: 1599,
    monthlyUsd: 29,
    annualUsd: 23,
    seatLimitLabel: 'Up to 250 team members / workspace',
    contactLimitLabel: '250,000 contacts',
    features: [
      'Unlimited workspaces & cross-workspace RBAC',
      'Role permissions (Owner, Admin, Manager, Member, Viewer)',
      'Multi-currency consolidated pipeline analytics',
      'Invoices & tax breakdown management',
      'Priority onboarding & support SLA',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    audience: 'For high-volume global organizations',
    monthlyInr: null,
    annualInr: null,
    monthlyUsd: null,
    annualUsd: null,
    seatLimitLabel: 'Unlimited seats',
    contactLimitLabel: 'Unlimited contacts',
    features: [
      'Dedicated Supabase region & partitioning',
      'Custom domain Resend email branding',
      'Audit trail exports & compliance review',
      'Custom ERP / accounting integrations',
      'Dedicated solutions architect',
    ],
  },
];
