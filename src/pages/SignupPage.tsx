import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { ConfigNotice } from '../components/ConfigNotice';
import { useAuthWorkspace } from '../contexts/AuthWorkspaceContext';
import {
  COUNTRY_PRESETS,
  detectBrowserTimezone,
  GLOBAL_TIMEZONES,
  SUPPORTED_CURRENCIES,
} from '../lib/intl';
import { getPublicAppUrl, supabase } from '../lib/supabase';

export default function SignupPage() {
  const { configMissing, acceptInviteByToken, refreshWorkspaceData } = useAuthWorkspace();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') || '';
  const invitedEmail = searchParams.get('email') || '';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [countryCode, setCountryCode] = useState('IN');
  const [currency, setCurrency] = useState('INR');
  const [timezone, setTimezone] = useState(() => detectBrowserTimezone());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    const preset = COUNTRY_PRESETS.find((c) => c.code === code);
    if (preset) {
      setCurrency(preset.currency);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError('Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const wsTitle = workspaceName.trim() || `${fullName.trim()}'s Workspace`;
      const emailRedirect = inviteToken
        ? `${getPublicAppUrl()}/invite/${inviteToken}`
        : `${getPublicAppUrl()}/app`;

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: emailRedirect,
          data: {
            full_name: fullName.trim(),
            workspace_name: wsTitle,
            preferred_timezone: timezone,
            preferred_currency: currency,
            country_code: countryCode,
          },
        },
      });

      if (signUpErr) throw new Error(signUpErr.message);

      // Fire non-blocking Resend welcome email
      fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: email.trim(),
          fullName: fullName.trim(),
          workspaceName: wsTitle,
          currency,
          timezone,
        }),
      }).catch(() => {});

      if (data.session) {
        await refreshWorkspaceData();
        if (inviteToken) {
          await acceptInviteByToken(inviteToken);
        }
        navigate('/app', { replace: true });
      } else {
        setVerificationSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100">
      <PublicNavbar />

      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        {configMissing && (
          <div className="mb-6">
            <ConfigNotice />
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          {verificationSent ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">
                Check your inbox to confirm
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-300">
                We sent a confirmation link to <strong>{email}</strong>. Once confirmed, your
                personal workspace
                {inviteToken ? ' and your invited team workspace' : ''} will open automatically.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Create your YourBiz CRM account
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                {inviteToken
                  ? 'You will receive your own personal workspace AND automatically join the invited workspace.'
                  : 'Launch your own workspace in under a minute.'}
              </p>

              <form onSubmit={handleSignup} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Priya Sharma"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Your Workspace Name
                    </label>
                    <input
                      type="text"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      placeholder="Acme India Sales"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@acme.in"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password (min 6 chars) *
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Primary Country
                    </label>
                    <select
                      value={countryCode}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      {SUPPORTED_CURRENCIES.map((cur) => (
                        <option key={cur.code} value={cur.code}>
                          {cur.code} ({cur.symbol}) — {cur.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Your Local Timezone (Auto-detected)
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    {GLOBAL_TIMEZONES.map((tz) => (
                      <option key={tz.iana} value={tz.iana}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  <span>
                    {loading
                      ? 'Creating Workspace...'
                      : inviteToken
                      ? 'Create Account & Join Workspace'
                      : 'Create Free Workspace'}
                  </span>
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
                Already have an account?{' '}
                <Link
                  to={`/login${inviteToken ? `?redirect=/invite/${inviteToken}` : ''}`}
                  className="font-semibold text-blue-700 hover:underline dark:text-blue-400"
                >
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
