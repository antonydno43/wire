import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';
import { PRICING_PLANS } from '../lib/plans';
import { formatCurrency } from '../lib/intl';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  const matrixRows = [
    { feature: 'Workspaces per Account', starter: '1', growth: 'Up to 5', scale: 'Unlimited', enterprise: 'Unlimited' },
    { feature: 'Team Members per Workspace', starter: '3', growth: '25', scale: '250', enterprise: 'Unlimited' },
    { feature: 'Contacts & Leads', starter: '1,000', growth: '25,000', scale: '250,000', enterprise: 'Unlimited' },
    { feature: 'Deal Pipelines', starter: '1', growth: '5', scale: 'Unlimited', enterprise: 'Unlimited' },
    { feature: 'Multi-Currency & Timezones', starter: 'Included', growth: 'Included', scale: 'Included', enterprise: 'Included' },
    { feature: 'GST / HSN / SAC Quotes & Invoices', starter: 'Basic Quotes', growth: 'Full Tax & PDF', scale: 'Full Tax & PDF', enterprise: 'Custom Templates' },
    { feature: 'Resend Team Email Invites', starter: 'Included', growth: 'Included', scale: 'Included', enterprise: 'Custom Domain' },
    { feature: 'Role-Based Access Control', starter: 'Owner & Member', growth: '5 Roles', scale: '5 Roles + Audit', enterprise: 'Custom RBAC' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100">
      <PublicNavbar />

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Plans &amp; Feature Limits
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300">
              Built for solo operators, growing Indian SMBs, and global multi-region teams. Switch
              currencies or billing cadence below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  currency === 'INR'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                INR (₹)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  currency === 'USD'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                USD ($)
              </button>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
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
              currency === 'INR'
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
                    ? 'border-blue-600 bg-white dark:border-blue-500 dark:bg-slate-900'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60'
                }`}
              >
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{plan.audience}</div>
                  <div className="mt-5">
                    {rawPrice === null ? (
                      <div className="font-display text-3xl font-bold text-slate-900 dark:text-white">
                        Custom
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono-num text-3xl font-bold text-slate-900 dark:text-white">
                          {formatCurrency(rawPrice, currency)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {rawPrice === 0 ? 'forever' : '/ user / mo'}
                        </span>
                      </div>
                    )}
                  </div>
                  <ul className="mt-6 space-y-2.5 border-t border-slate-200 pt-5 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
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
                    className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                      plan.highlight
                        ? 'bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500'
                        : 'border border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800'
                    }`}
                  >
                    {plan.id === 'enterprise' ? 'Submit Enterprise Query' : 'Start with ' + plan.name}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="mt-16 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Detailed Tier Comparison
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <th className="px-6 py-3.5">Capability</th>
                  <th className="px-6 py-3.5">Starter</th>
                  <th className="px-6 py-3.5">Growth</th>
                  <th className="px-6 py-3.5">Scale</th>
                  <th className="px-6 py-3.5">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {matrixRows.map((row) => (
                  <tr key={row.feature} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3.5 font-medium text-slate-900 dark:text-white">
                      {row.feature}
                    </td>
                    <td className="px-6 py-3.5 font-mono-num text-slate-600 dark:text-slate-300">
                      {row.starter}
                    </td>
                    <td className="px-6 py-3.5 font-mono-num text-slate-600 dark:text-slate-300">
                      {row.growth}
                    </td>
                    <td className="px-6 py-3.5 font-mono-num text-slate-600 dark:text-slate-300">
                      {row.scale}
                    </td>
                    <td className="px-6 py-3.5 font-mono-num text-slate-600 dark:text-slate-300">
                      {row.enterprise}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
