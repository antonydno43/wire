import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildWelcomeEmailHtml, getResendClient } from './_lib/resend.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { toEmail, fullName, workspaceName, currency, timezone } = (req.body || {}) as {
    toEmail?: string;
    fullName?: string;
    workspaceName?: string;
    currency?: string;
    timezone?: string;
  };

  if (!toEmail || !fullName) {
    return res.status(400).json({ error: 'Missing required fields (toEmail, fullName).' });
  }

  const { client, from } = getResendClient();
  if (!client) {
    return res.status(200).json({
      sent: false,
      reason: 'RESEND_API_KEY not configured on server.',
    });
  }

  const reqHost = req.headers.host;
  const reqProto = (req.headers['x-forwarded-proto'] as string) || undefined;
  const { subject, html } = buildWelcomeEmailHtml({
    fullName,
    workspaceName: workspaceName || `${fullName}'s Workspace`,
    currency: currency || 'INR',
    timezone: timezone || 'Asia/Kolkata',
    reqHost,
    reqProto,
  });

  try {
    const result = await client.emails.send({
      from,
      to: toEmail,
      subject,
      html,
    });

    if (result.error) {
      return res.status(200).json({ sent: false, error: result.error.message });
    }

    return res.status(200).json({ sent: true, emailId: result.data?.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send welcome email';
    return res.status(200).json({ sent: false, error: message });
  }
}
