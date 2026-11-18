import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  buildInviteEmailHtml,
  getResendClient,
  verifySupabaseAuthHeader,
} from './_lib/resend.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verifySupabaseAuthHeader(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Valid Supabase session required.' });
  }

  const {
    toEmail,
    inviterName,
    workspaceName,
    role,
    inviteToken,
    workspaceTimezone,
  } = (req.body || {}) as {
    toEmail?: string;
    inviterName?: string;
    workspaceName?: string;
    role?: string;
    inviteToken?: string;
    workspaceTimezone?: string;
  };

  if (!toEmail || !workspaceName || !inviteToken) {
    return res.status(400).json({ error: 'Missing required invite fields (toEmail, workspaceName, inviteToken).' });
  }

  const reqHost = req.headers.host;
  const reqProto = (req.headers['x-forwarded-proto'] as string) || undefined;
  const { subject, html, inviteUrl } = buildInviteEmailHtml({
    inviterName: inviterName || user.email,
    workspaceName,
    role: role || 'member',
    inviteToken,
    workspaceTimezone: workspaceTimezone || 'Asia/Kolkata',
    reqHost,
    reqProto,
  });

  const { client, from } = getResendClient();
  if (!client) {
    return res.status(200).json({
      sent: false,
      reason: 'RESEND_API_KEY not configured on server. Invite saved in database; share the invite link directly.',
      inviteUrl,
    });
  }

  try {
    const result = await client.emails.send({
      from,
      to: toEmail,
      subject,
      html,
    });

    if (result.error) {
      return res.status(502).json({
        sent: false,
        error: result.error.message,
        inviteUrl,
      });
    }

    return res.status(200).json({
      sent: true,
      emailId: result.data?.id,
      inviteUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send invite email';
    return res.status(500).json({ sent: false, error: message, inviteUrl });
  }
}
