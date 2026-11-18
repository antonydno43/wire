import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, Globe2, ShieldAlert } from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { ConfigNotice } from '../components/ConfigNotice';
import { useAuthWorkspace } from '../contexts/AuthWorkspaceContext';
import { supabase } from '../lib/supabase';
import type { InvitationPreview } from '../types/crm';

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, configMissing, acceptInviteByToken, signOut } = useAuthWorkspace();

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadPreview() {
      if (!supabase || !token) {
        setLoadingPreview(false);
        return;
      }
      const { data, error: rpcErr } = await supabase.rpc('get_invitation_preview', {
        invite_token: token,
      });
      if (!active) return;
      if (rpcErr) {
        setError(rpcErr.message);
      } else if (Array.isArray(data) && data.length > 0) {
        setPreview(data[0] as InvitationPreview);
      } else {
        setError('This invitation link is invalid or no longer exists.');
      }
      setLoadingPreview(false);
    }
    loadPreview();
    return () => {
      active = false;
    };
  }, [token]);

  const handleConfirmJoin = async () => {
    if (!token) return;
    setError(null);
    setJoining(true);
    const { workspaceId, error: joinErr } = await acceptInviteByToken(token);
    setJoining(false);
    if (joinErr) {
      setError(joinErr);
      return;
    }
    if (workspaceId) {
      navigate('/app', { replace: true });
    }
  };

  const emailMismatch =
    Boolean(user?.email && preview?.invited_email) &&
    user!.email!.toLowerCase() !== preview!.invited_email.toLowerCase();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100">
      <PublicNavbar />

      <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        {configMissing && (
          <div className="mb-6">
            <ConfigNotice />
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          {loadingPreview ? (
            <div className="space-y-4 py-6">
              <div className="h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ) : error && !preview ? (
            <div className="py-6 text-center">
              <ShieldAlert className="mx-auto h-10 w-10 text-red-600" />
              <h1 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">
                Invitation Unavailable
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error}</p>
              <Link
                to="/"
                className="mt-6 inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
              >
                Back to Home
              </Link>
            </div>
          ) : preview ? (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
                <Building2 className="h-4 w-4" />
                <span>Workspace Invitation</span>
              </div>

              <h1 className="mt-3 font-display text-2xl font-bold text-slate-900 dark:text-white">
                Join {preview.workspace_name}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <strong>{preview.inviter_name}</strong> invited{' '}
                <strong>{preview.invited_email}</strong> to join as{' '}
                <strong className="capitalize">{preview.role}</strong>.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Globe2 className="h-4 w-4 text-blue-600" />
                  Base Timezone: {preview.workspace_timezone}
                </span>
                <span aria-hidden="true">·</span>
                <span>Currency: {preview.workspace_currency}</span>
              </div>

              {preview.status === 'expired' || preview.status === 'revoked' ? (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                  This invitation is {preview.status}. Ask {preview.inviter_name} to send a fresh
                  invitation from Workspace Team Settings.
                </div>
              ) : preview.status === 'accepted' && user && !emailMismatch ? (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>You are already a member of this workspace.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmJoin}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    <span>Switch to {preview.workspace_name}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : user ? (
                emailMismatch ? (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                      You are currently signed in as <strong>{user.email}</strong>, but this invite
                      was sent to <strong>{preview.invited_email}</strong>. Sign out and sign in or
                      register with {preview.invited_email}.
                    </div>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
                    >
                      Sign Out &amp; Switch Account
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                        {error}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={joining}
                      onClick={handleConfirmJoin}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                    >
                      <span>{joining ? 'Joining Workspace...' : `Confirm & Join ${preview.workspace_name}`}</span>
                      {!joining && <ArrowRight className="h-4 w-4" />}
                    </button>
                  </div>
                )
              ) : (
                <div className="mt-6 space-y-3">
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    New to YourBiz CRM? Create your account below—you’ll get your own personal
                    workspace and can switch between yours and {preview.workspace_name} anytime.
                  </p>
                  <Link
                    to={`/signup?invite=${encodeURIComponent(token || '')}&email=${encodeURIComponent(preview.invited_email)}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    <span>Create Account &amp; Join</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to={`/login?redirect=${encodeURIComponent(`/invite/${token || ''}`)}&email=${encodeURIComponent(preview.invited_email)}`}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    I Already Have an Account — Sign In
                  </Link>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
