import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';

export default function LegalPage({ mode }: { mode: 'privacy' | 'terms' }) {
  const isPrivacy = mode === 'privacy';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100">
      <PublicNavbar />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
        </h1>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Effective Date: November 2026 · YourBiz CRM
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {isPrivacy ? (
            <>
              <section>
                <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  1. Workspace Data Isolation
                </h2>
                <p className="mt-2">
                  All contacts, companies, deals, tasks, quotes, and activity logs created inside
                  YourBiz CRM are strictly scoped to their workspace using PostgreSQL Row-Level
                  Security (RLS). Only authenticated members explicitly invited to a workspace may
                  read or modify records within that workspace.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  2. Transactional Emails &amp; Timezone Storage
                </h2>
                <p className="mt-2">
                  YourBiz CRM uses Resend strictly to deliver account onboarding emails, workspace
                  invitations, and support query notifications. Timestamps are stored in UTC and
                  converted locally using your preferred IANA timezone.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  3. Data Ownership &amp; Export
                </h2>
                <p className="mt-2">
                  You retain full ownership of all customer and commercial data uploaded into your
                  workspaces. You may export your contacts via CSV or remove records at any time.
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  1. Account &amp; Workspace Responsibilities
                </h2>
                <p className="mt-2">
                  Each registered user receives a personal workspace and may create or join
                  additional team workspaces. Workspace owners and administrators are responsible for
                  managing member roles and revoking invitations when team members depart.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  2. Acceptable Commercial Use
                </h2>
                <p className="mt-2">
                  YourBiz CRM is designed for legitimate B2B and B2C customer relationship
                  management, sales pipeline tracking, and commercial quoting. Sending unsolicited
                  bulk spam through workspace invitations is strictly prohibited.
                </p>
              </section>
              <section>
                <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  3. Subscription Tiers &amp; Billing
                </h2>
                <p className="mt-2">
                  Starter workspaces are free within documented seat and contact limits. Paid Growth,
                  Scale, and Enterprise tiers expand workspace, contact, and RBAC quotas according
                  to your active plan.
                </p>
              </section>
            </>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
