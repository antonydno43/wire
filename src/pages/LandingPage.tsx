import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  Globe2,
  Kanban,
  ReceiptIndianRupee,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';
import {
  formatCurrency,
  formatInTimezone,
  getCurrentTimeInTimezone,
  GLOBAL_TIMEZONES,
  SUPPORTED_CURRENCIES,
} from '../lib/intl';
import { PRICING_PLANS } from '../lib/plans';

export default function LandingPage() {
  const [previewCurrency, setPreviewCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP' | 'AED'>('INR');
  const [adminTz, setAdminTz] = useState('Asia/Kolkata');
  const [memberTz, setMemberTz] = useState('America/New_York');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [priceCurrency, setPriceCurrency] = useState<'INR' | 'USD'>('INR');

  // Fixed reference UTC instant for live interactive timezone conversion showcase
  const sampleMeetingUtc = '2026-11-18T14:30:00.000Z';

  const sampleDealBaseUsd = 48000;
  const currencyMap: Record<string, number> = {
    INR: 4032000,
    USD: 48000,
    EUR: 44400,
    GBP: 37800,
    AED: 176280,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100">
      <PublicNavbar />

      {/* HERO SECTION */}
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Focal Copy */}
          <div className="flex flex-col justify-between lg:col-span-6">
            <div>
              <div className="text-xs font-medium tracking-wide text-blue-700 dark:text-blue-400">
                Built for India &amp; Global Revenue Teams · Multi-Workspace SaaS
              </div>

              <h1 className="mt-4 max-w-2xl font-display text-[clamp(2.25rem,4vw,3.5rem)] font-bold leading-[1.1] tracking-tight text-slate-900 [text-wrap:balance] dark:text-white">
                One clear CRM for every pipeline, currency, and timezone.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                YourBiz CRM gives medium and upper-medium businesses the pipeline depth of Zoho CRM
                with the clarity of HubSpot. Manage leads, GST-ready quotes, and distributed teams
                without spreadsheet friction.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  <span>Create Free Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/queries"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Request Onboarding Demo
                </Link>
              </div>
            </div>

            {/* Interactive Currency & Timezone Preview Strip */}
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-slate-200 pt-6 dark:border-slate-800">
              <div>
                <div className="font-mono-num text-xl font-semibold text-slate-900 dark:text-white">
                  9+
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Native currencies incl. INR ₹
                </div>
              </div>
              <div>
                <div className="font-mono-num text-xl font-semibold text-slate-900 dark:text-white">
                  UTC
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Zero-conflict timezone sync
                </div>
              </div>
              <div>
                <div className="font-mono-num text-xl font-semibold text-slate-900 dark:text-white">
                  RLS
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Row-level workspace isolation
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual Carrier */}
          <div className="relative lg:col-span-6">
            <div className="relative h-full min-h-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 dark:border-slate-800">
              <img
                src="/src/assets/images/hero_yourbiz_crm_1794991748403.jpg"
                alt="Modern glass executive conference suite where distributed revenue teams collaborate"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />

              {/* Glassmorphic Live Multi-Currency Switcher Overlay */}
              <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/20 bg-white/90 p-4 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/90">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Interactive Pipeline Value Preview
                    </div>
                    <div className="mt-0.5 font-mono-num text-xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(currencyMap[previewCurrency] || sampleDealBaseUsd, previewCurrency)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                    {(['INR', 'USD', 'EUR', 'GBP', 'AED'] as const).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setPreviewCurrency(code)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          previewCurrency === code
                            ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-400'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES BENTO GRID */}
      <section
        id="features"
        className="border-t border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-[#0E1420]"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance] dark:text-white">
              Everything required to run B2B and B2C sales without clutter.
            </h2>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
              Designed so any business owner or sales rep can adopt it in ten minutes, while giving
              managers strict role permissions and real-time pipeline visibility.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Marquee Card 01 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-7 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900/60">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    01. Visual Sales Pipeline
                  </span>
                  <Kanban className="h-5 w-5 text-slate-400" />
                </div>
                <h3 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                  Kanban stages with weighted revenue forecasting
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Move deals seamlessly from Lead In through Contacted, Qualified, Proposal Sent,
                  Negotiation, and Closed Won. Track expected close dates, win probabilities, and
                  multi-currency deal values in one board or list table.
                </p>
              </div>
              <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <img
                  src="/src/assets/images/feature_workspace_sync_1794991748097.jpg"
                  alt="Minimalist executive workspace desk prepared for morning pipeline reviews"
                  referrerPolicy="no-referrer"
                  className="h-52 w-full object-cover"
                />
              </div>
            </div>

            {/* Card 02 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-7 dark:border-slate-800 dark:bg-slate-900/60">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    02. Multi-Workspace Switching
                  </span>
                  <Users className="h-5 w-5 text-slate-400" />
                </div>
                <h3 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                  Own your workspace, collaborate in others
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Every user automatically receives their own workspace on sign-up. When an admin
                  invites a teammate via Resend email, even brand-new users can create an account,
                  confirm joining, and switch between their own workspace and yours in one click.
                </p>
              </div>
              <div className="mt-6 space-y-2.5 border-t border-slate-200 pt-5 text-sm dark:border-slate-800">
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Role-based access (Owner, Admin, Manager, Member, Viewer)</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Tokenized Resend email invitations</span>
                </div>
              </div>
            </div>

            {/* Card 03 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-7 dark:border-slate-800 dark:bg-slate-900/60">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    03. GST, HSN &amp; Quotes
                  </span>
                  <ReceiptIndianRupee className="h-5 w-5 text-slate-400" />
                </div>
                <h3 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                  Commercial catalogs &amp; tax-ready quotes
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Store product SKUs, HSN/SAC codes, and GST or VAT rates. Generate itemized quotes
                  and invoices directly from any deal with instant subtotal and tax calculations.
                </p>
              </div>
              <div className="mt-6 space-y-2.5 border-t border-slate-200 pt-5 text-sm dark:border-slate-800">
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Company GSTIN / Tax ID tracking</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Print-ready quote &amp; invoice previews</span>
                </div>
              </div>
            </div>

            {/* Marquee Card 04 */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-7 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
                    <span>04. Contacts, Companies &amp; CSV</span>
                  </div>
                  <h3 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                    Contact 360 timeline &amp; instant CSV migration
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Log phone calls, WhatsApp outreach, meetings, and emails on a single timeline.
                    Import existing spreadsheets via CSV in seconds or export your full database at
                    any time.
                  </p>
                  <div className="mt-5 flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      B2B Accounts
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Postgres RLS Security
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <img
                    src="/src/assets/images/feature_global_commerce_1794991749586.jpg"
                    alt="International glass corporate towers reflecting golden sunlight"
                    referrerPolicy="no-referrer"
                    className="h-52 w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE CROSS-TIMEZONE & CURRENCY SIMULATOR */}
      <section id="global-sync" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <Globe2 className="h-4 w-4" />
              <span>Zero-Conflict Global Scheduling</span>
            </div>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance] dark:text-white">
              Admin in Bengaluru. Sales rep in New York. Zero calendar confusion.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Every task, follow-up call, and activity log is stored in UTC inside PostgreSQL and
              automatically rendered in each team member’s personal timezone—plus the workspace’s
              primary currency and clock.
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  Automatic browser timezone detection on signup with instant manual override in
                  Profile Settings.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Globe2 className="mt-0.5 h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  Supports {SUPPORTED_CURRENCIES.length} major global currencies including Indian
                  Lakh/Crore formatting (`en-IN`).
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              Interactive Cross-Timezone Preview
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Pick two team member locations to see how YourBiz CRM displays the exact same scheduled
              client follow-up without conflict.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Workspace Admin Location
                </label>
                <select
                  value={adminTz}
                  onChange={(e) => setAdminTz(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {GLOBAL_TIMEZONES.map((tz) => (
                    <option key={tz.iana} value={tz.iana}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Remote Team Member Location
                </label>
                <select
                  value={memberTz}
                  onChange={(e) => setMemberTz(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {GLOBAL_TIMEZONES.map((tz) => (
                    <option key={tz.iana} value={tz.iana}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2 dark:border-slate-800">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Admin sees ({adminTz})
                </div>
                <div className="mt-1 font-mono-num text-sm font-semibold text-slate-900 dark:text-white">
                  {formatInTimezone(sampleMeetingUtc, adminTz)}
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Local clock now: {getCurrentTimeInTimezone(adminTz)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Member sees ({memberTz})
                </div>
                <div className="mt-1 font-mono-num text-sm font-semibold text-blue-700 dark:text-blue-400">
                  {formatInTimezone(sampleMeetingUtc, memberTz)}
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Local clock now: {getCurrentTimeInTimezone(memberTz)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section
        id="pricing"
        className="border-t border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-[#0E1420]"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance] dark:text-white">
                Transparent plans built to scale with your business
              </h2>
              <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                Start free with up to 3 team members. Upgrade as your pipeline grows.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setPriceCurrency('INR')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    priceCurrency === 'INR'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  INR (₹)
                </button>
                <button
                  type="button"
                  onClick={() => setPriceCurrency('USD')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    priceCurrency === 'USD'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  USD ($)
                </button>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    billingCycle === 'annual'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Annual (Save 20%)
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PRICING_PLANS.map((plan) => {
              const rawPrice =
                priceCurrency === 'INR'
                  ? billingCycle === 'annual'
                    ? plan.annualInr
                    : plan.monthlyInr
                  : billingCycle === 'annual'
                  ? plan.annualUsd
                  : plan.monthlyUsd;

              return (
                <div
                  key={plan.id}
                  className={`flex flex-col justify-between rounded-2xl border p-6 ${
                    plan.highlight
                      ? 'border-blue-600 bg-white ring-1 ring-blue-600/20 dark:border-blue-500 dark:bg-slate-900'
                      : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/50'
                  }`}
                >
                  <div>
                    <div className="text-base font-bold text-slate-900 dark:text-white">
                      {plan.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {plan.audience}
                    </div>

                    <div className="mt-5">
                      {rawPrice === null ? (
                        <div className="font-display text-3xl font-bold text-slate-900 dark:text-white">
                          Custom
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="font-mono-num text-3xl font-bold text-slate-900 dark:text-white">
                            {formatCurrency(rawPrice, priceCurrency)}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {rawPrice === 0 ? 'forever' : '/ user / mo'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {plan.seatLimitLabel} · {plan.contactLimitLabel}
                    </div>

                    <ul className="mt-5 space-y-2.5 border-t border-slate-200 pt-5 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6">
                    <Link
                      to={plan.id === 'enterprise' ? '/queries' : '/signup'}
                      className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        plan.highlight
                          ? 'bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500'
                          : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800'
                      }`}
                    >
                      {plan.id === 'enterprise' ? 'Contact Sales' : 'Get Started'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
