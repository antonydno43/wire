import React, { useEffect, useState } from 'react';
import { Check, CreditCard, Globe2, User } from 'lucide-react';
import { useAuthWorkspace } from '../../contexts/AuthWorkspaceContext';
import { supabase } from '../../lib/supabase';
import { COUNTRY_PRESETS, GLOBAL_TIMEZONES, SUPPORTED_CURRENCIES } from '../../lib/intl';
import { PRICING_PLANS } from '../../lib/plans';
import type { PlanTier } from '../../types/crm';

export default function SettingsPage() {
  const {
    user,
    profile,
    activeWorkspace,
    activeRole,
    refreshWorkspaceData,
  } = useAuthWorkspace();

  // Personal Profile State
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [jobTitle, setJobTitle] = useState(profile?.job_title || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [prefTimezone, setPrefTimezone] = useState(profile?.preferred_timezone || 'Asia/Kolkata');
  const [prefCurrency, setPrefCurrency] = useState(profile?.preferred_currency || 'INR');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Workspace Settings State
  const [wsName, setWsName] = useState(activeWorkspace?.name || '');
  const [wsCountry, setWsCountry] = useState(activeWorkspace?.country_code || 'IN');
  const [wsCurrency, setWsCurrency] = useState(activeWorkspace?.default_currency || 'INR');
  const [wsTimezone, setWsTimezone] = useState(activeWorkspace?.default_timezone || 'Asia/Kolkata');
  const [wsTaxId, setWsTaxId] = useState(activeWorkspace?.gst_or_tax_id || '');
  const [savingWs, setSavingWs] = useState(false);
  const [wsMsg, setWsMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setJobTitle(profile.job_title || '');
      setPhone(profile.phone || '');
      setPrefTimezone(profile.preferred_timezone);
      setPrefCurrency(profile.preferred_currency);
    }
  }, [profile]);

  useEffect(() => {
    if (activeWorkspace) {
      setWsName(activeWorkspace.name);
      setWsCountry(activeWorkspace.country_code);
      setWsCurrency(activeWorkspace.default_currency);
      setWsTimezone(activeWorkspace.default_timezone);
      setWsTaxId(activeWorkspace.gst_or_tax_id || '');
    }
  }, [activeWorkspace]);

  const canManageWorkspace = activeRole === 'owner' || activeRole === 'admin';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return;
    setSavingProfile(true);
    setProfileMsg(null);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        job_title: jobTitle.trim() || null,
        phone: phone.trim() || null,
        preferred_timezone: prefTimezone,
        preferred_currency: prefCurrency,
      })
      .eq('id', user.id);

    setSavingProfile(false);
    if (error) {
      setProfileMsg(error.message);
      return;
    }
    await refreshWorkspaceData();
    setProfileMsg('Profile and personal timezone updated.');
  };

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !activeWorkspace || !canManageWorkspace) return;
    setSavingWs(true);
    setWsMsg(null);

    const { error } = await supabase
      .from('workspaces')
      .update({
        name: wsName.trim(),
        country_code: wsCountry,
        default_currency: wsCurrency,
        default_timezone: wsTimezone,
        gst_or_tax_id: wsTaxId.trim() || null,
      })
      .eq('id', activeWorkspace.id);

    setSavingWs(false);
    if (error) {
      setWsMsg(error.message);
      return;
    }
    await refreshWorkspaceData();
    setWsMsg('Workspace configuration updated.');
  };

  const handleSelectPlan = async (tier: PlanTier) => {
    if (!supabase || !activeWorkspace || !canManageWorkspace) return;
    const limits: Record<PlanTier, { seats: number; contacts: number }> = {
      starter: { seats: 3, contacts: 1000 },
      growth: { seats: 25, contacts: 25000 },
      scale: { seats: 250, contacts: 250000 },
      enterprise: { seats: 10000, contacts: 10000000 },
    };
    const { error } = await supabase
      .from('workspaces')
      .update({
        plan_tier: tier,
        seat_limit: limits[tier].seats,
        contact_limit: limits[tier].contacts,
      })
      .eq('id', activeWorkspace.id);

    if (!error) {
      await refreshWorkspaceData();
    }
  };

  return (
    <div className="space-y-8">
      {/* Personal Profile & Timezone */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Your Profile &amp; Local Timezone
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Your personal timezone applies across every workspace you belong to—so tasks scheduled by
          colleagues in India or the US always display accurately in your local time.
        </p>

        <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Sales Manager"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                My Preferred Timezone
              </label>
              <select
                value={prefTimezone}
                onChange={(e) => setPrefTimezone(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                {GLOBAL_TIMEZONES.map((tz) => (
                  <option key={tz.iana} value={tz.iana}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Preferred Currency
              </label>
              <select
                value={prefCurrency}
                onChange={(e) => setPrefCurrency(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {profileMsg && (
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {profileMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </section>

      {/* Workspace Settings */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-blue-600" />
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Workspace Regional &amp; Tax Settings
          </h2>
        </div>

        <form onSubmit={handleSaveWorkspace} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Workspace Name
              </label>
              <input
                type="text"
                disabled={!canManageWorkspace}
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                GSTIN / Company Tax ID
              </label>
              <input
                type="text"
                disabled={!canManageWorkspace}
                value={wsTaxId}
                onChange={(e) => setWsTaxId(e.target.value)}
                placeholder="29ABCDE1234F1Z5"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Country
              </label>
              <select
                disabled={!canManageWorkspace}
                value={wsCountry}
                onChange={(e) => setWsCountry(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              >
                {COUNTRY_PRESETS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Base Currency
              </label>
              <select
                disabled={!canManageWorkspace}
                value={wsCurrency}
                onChange={(e) => setWsCurrency(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Workspace Timezone
              </label>
              <select
                disabled={!canManageWorkspace}
                value={wsTimezone}
                onChange={(e) => setWsTimezone(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              >
                {GLOBAL_TIMEZONES.map((tz) => (
                  <option key={tz.iana} value={tz.iana}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {wsMsg && (
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {wsMsg}
            </div>
          )}

          {canManageWorkspace && (
            <button
              type="submit"
              disabled={savingWs}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {savingWs ? 'Saving...' : 'Save Workspace Settings'}
            </button>
          )}
        </form>
      </section>

      {/* Plan & Monetization */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Workspace Subscription Plan
            </h2>
          </div>
          <span className="font-mono-num text-xs font-semibold uppercase text-blue-700 dark:text-blue-400">
            Active: {activeWorkspace?.plan_tier || 'starter'}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PRICING_PLANS.map((plan) => {
            const isCurrent = activeWorkspace?.plan_tier === plan.id;
            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between rounded-xl border p-4 ${
                  isCurrent
                    ? 'border-blue-600 bg-blue-50/40 dark:border-blue-500 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{plan.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{plan.seatLimitLabel}</div>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {plan.features.slice(0, 3).map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isCurrent || !canManageWorkspace}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`mt-4 w-full rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-300 text-slate-800 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : `Switch to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
