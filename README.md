# YourBiz CRM

Multi-workspace SaaS CRM built for growing medium and upper-medium businesses in India and worldwide.

## Key Capabilities
- **Multi-Workspace Architecture**: Every user gets their own personal workspace upon registration and can create additional workspaces or accept Resend email invitations to join teammates' workspaces—switching seamlessly from the sidebar.
- **Visual Deals & Pipeline**: Drag-and-drop Kanban board and tabular list view with stage win probabilities, weighted forecasting, and automatic stage-transition activity logs.
- **Multi-Currency Support**: Native `INR (₹)` Lakh/Crore formatting (`en-IN`) alongside `USD`, `EUR`, `GBP`, `AED`, `SGD`, `AUD`, `CAD`, and `JPY`.
- **Cross-Timezone Synchronization**: All tasks, reminders, and activity timestamps are stored in UTC (`TIMESTAMPTZ`) and automatically rendered in each member's preferred IANA timezone alongside the workspace base timezone.
- **GST / HSN / SAC Catalog & Quotes**: Manage product SKUs, HSN/SAC codes, and tax rates to build printable quotes and invoices.
- **Contacts 360° & CSV Migration**: Import and export contacts via CSV, log calls/notes/emails/WhatsApp outreach, and track lifecycle stages (`Lead`, `MQL`, `SQL`, `Customer`, `Evangelist`, `Churned`).
- **High-Scale Supabase PostgreSQL + RLS**: Indexed composite B-tree keys (`workspace_id`, `created_at`) and `SECURITY DEFINER` membership functions for zero-lock Row-Level Security.

## 1. Supabase Setup & Migrations
Run the SQL files in order inside your Supabase Dashboard **SQL Editor**:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_and_functions.sql`

## 2. Vercel Environment Variables
Add these environment variables in **Vercel Project Settings → Environment Variables**:

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Client & Build | Your Supabase Project URL (`https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Client & Build | Your Supabase public `anon` key |
| `VITE_APP_URL` | Client & Build | Your production Vercel domain (e.g. `https://yourbizcrm.com`) |
| `SUPABASE_URL` | Serverless `/api/*` | Same Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Serverless `/api/*` | Supabase `service_role` secret key (used to verify invite API calls) |
| `RESEND_API_KEY` | Serverless `/api/*` | Your Resend API key (`re_...`) |
| `RESEND_FROM_EMAIL` | Serverless `/api/*` | Verified sender (e.g. `YourBiz CRM <hello@yourdomain.com>`) |
| `SUPPORT_NOTIFY_EMAIL` | Serverless `/api/*` | Inbox email to receive `/queries` submissions |
| `APP_URL` | Serverless `/api/*` | Production domain used inside email CTA links |

## 3. Local Development
```bash
npm install
npm run dev
```
