import React, { useCallback, useEffect, useState } from 'react';
import { Check, Clock, Copy, MailPlus, Send, Trash2 } from 'lucide-react';
import { useAuthWorkspace } from '../../contexts/AuthWorkspaceContext';
import { getPublicAppUrl, supabase } from '../../lib/supabase';
import { getCurrentTimeInTimezone } from '../../lib/intl';
import type { WorkspaceInvitation, WorkspaceMembership, WorkspaceRole } from '../../types/crm';

export default function TeamPage() {
  const { activeWorkspace, activeRole, user, profile, session } = useAuthWorkspace();
  const [members, setMembers] = useState<WorkspaceMembership[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<WorkspaceRole, 'owner'>>('member');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const canManageTeam = activeRole === 'owner' || activeRole === 'admin' || activeRole === 'manager';

  const loadTeam = useCallback(async () => {
    if (!supabase || !activeWorkspace) return;
    setLoading(true);
    const wsId = activeWorkspace.id;

    const [mRes, iRes] = await Promise.all([
      supabase
        .from('workspace_members')
        .select('*, profiles(id, email, full_name, preferred_timezone, job_title, avatar_url)')
        .eq('workspace_id', wsId)
        .order('joined_at', { ascending: true }),
      supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', wsId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    setMembers((mRes.data || []) as unknown as WorkspaceMembership[]);
    setInvites((iRes.data || []) as WorkspaceInvitation[]);
    setLoading(false);
  }, [activeWorkspace]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const dispatchInviteEmail = async (email: string, role: string, token: string) => {
    if (!activeWorkspace) return { sent: false, reason: 'No active workspace' };
    try {
      const resp = await fetch('/api/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          toEmail: email,
          inviterName: profile?.full_name || user?.email || 'Workspace Admin',
          workspaceName: activeWorkspace.name,
          role,
          inviteToken: token,
          workspaceTimezone: activeWorkspace.default_timezone,
        }),
      });
      return (await resp.json()) as { sent?: boolean; reason?: string; error?: string };
    } catch {
      return { sent: false, reason: 'Email server unavailable' };
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !activeWorkspace || !user || !canManageTeam) return;

    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    setSending(true);
    setFeedback(null);

    const { data: created, error } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: activeWorkspace.id,
        email: cleanEmail,
        role: inviteRole,
        invited_by: user.id,
      })
      .select('*')
      .single();

    if (error) {
      setFeedback({ type: 'err', text: error.message });
      setSending(false);
      return;
    }

    const inv = created as WorkspaceInvitation;
    const emailResp = await dispatchInviteEmail(cleanEmail, inviteRole, inv.token);

    setInviteEmail('');
    setSending(false);
    loadTeam();

    if (emailResp.sent) {
      setFeedback({
        type: 'ok',
        text: `Invitation email sent via Resend to ${cleanEmail}. If they don't have an account yet, they can register via that link and join automatically.`,
      });
    } else {
      setFeedback({
        type: 'ok',
        text: `Invitation created for ${cleanEmail}. ${emailResp.reason || 'Copy the invite link below to share directly.'}`,
      });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: WorkspaceRole) => {
    if (!supabase || (activeRole !== 'owner' && activeRole !== 'admin')) return;
    await supabase.from('workspace_members').update({ role: newRole }).eq('id', memberId);
    loadTeam();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!supabase || (activeRole !== 'owner' && activeRole !== 'admin')) return;
    await supabase.from('workspace_members').delete().eq('id', memberId);
    loadTeam();
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!supabase || !canManageTeam) return;
    await supabase
      .from('workspace_invitations')
      .update({ status: 'revoked' })
      .eq('id', inviteId);
    loadTeam();
  };

  const copyLink = async (token: string) => {
    const link = `${getPublicAppUrl()}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      {canManageTeam && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <MailPlus className="h-5 w-5 text-blue-600" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Invite Teammate to {activeWorkspace?.name}
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            They will receive a Resend email invite. If they don’t have a YourBiz CRM account yet,
            they can create one, keep their own personal workspace, and switch into yours anytime.
          </p>

          <form onSubmit={handleSendInvite} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Exclude<WorkspaceRole, 'owner'>)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer (Read-Only)</option>
            </select>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Send className="h-4 w-4" />
              <span>{sending ? 'Sending...' : 'Send Invite'}</span>
            </button>
          </form>

          {feedback && (
            <div
              className={`mt-3 rounded-lg border px-3.5 py-2.5 text-xs ${
                feedback.type === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
              }`}
            >
              {feedback.text}
            </div>
          )}
        </div>
      )}

      {/* Active Members */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Active Workspace Members ({members.length} / {activeWorkspace?.seat_limit ?? 3})
          </h3>
        </div>

        {loading ? (
          <div className="p-6 text-xs text-slate-500">Loading members...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <th className="px-6 py-3">Member</th>
                  <th className="px-6 py-3">Local Timezone &amp; Clock</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {members.map((m) => {
                  const tz = m.profiles?.preferred_timezone || 'Asia/Kolkata';
                  const isSelf = m.user_id === user?.id;
                  return (
                    <tr key={m.id}>
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {m.profiles?.full_name || 'Member'} {isSelf ? '(You)' : ''}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {m.profiles?.email}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="inline-flex items-center gap-1.5 font-mono-num text-xs text-slate-700 dark:text-slate-300">
                          <Clock className="h-3.5 w-3.5 text-blue-600" />
                          <span>{getCurrentTimeInTimezone(tz)}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">{tz}</div>
                      </td>
                      <td className="px-6 py-3.5">
                        {m.role === 'owner' ||
                        (activeRole !== 'owner' && activeRole !== 'admin') ? (
                          <span className="text-xs font-semibold capitalize text-slate-800 dark:text-slate-200">
                            {m.role}
                          </span>
                        ) : (
                          <select
                            value={m.role}
                            onChange={(e) =>
                              handleRoleChange(m.id, e.target.value as WorkspaceRole)
                            }
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium capitalize dark:border-slate-700 dark:bg-slate-950"
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {m.role !== 'owner' &&
                          (activeRole === 'owner' || activeRole === 'admin') && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.id)}
                              className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
                            >
                              Remove
                            </button>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {invites.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Pending Invitations ({invites.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 text-sm"
              >
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{inv.email}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Role: <span className="capitalize">{inv.role}</span> · Expires{' '}
                    {new Date(inv.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => copyLink(inv.token)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {copiedToken === inv.token ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Invite Link</span>
                      </>
                    )}
                  </button>
                  {canManageTeam && (
                    <button
                      type="button"
                      onClick={() => handleRevokeInvite(inv.id)}
                      aria-label="Revoke invite"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
