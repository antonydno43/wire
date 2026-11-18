import type { VercelRequest, VercelResponse } from '@vercel/node';
import { escapeHtml, getResendClient } from './_lib/resend.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, company, country, timezone, subject, message } = (req.body || {}) as {
    name?: string;
    email?: string;
    company?: string;
    country?: string;
    timezone?: string;
    subject?: string;
    message?: string;
  };

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Please provide name, email, subject, and message.' });
  }

  const { client, from } = getResendClient();
  if (!client) {
    return res.status(200).json({
      notified: false,
      reason: 'Query recorded; RESEND_API_KEY not configured for email forwarding.',
    });
  }

  const notifyTo = process.env.SUPPORT_NOTIFY_EMAIL || email;

  try {
    await client.emails.send({
      from,
      to: notifyTo,
      replyTo: email,
      subject: `[YourBiz CRM Query] ${subject}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; padding: 24px; color: #0f172a;">
          <h2 style="margin: 0 0 12px;">New Inquiry Received</h2>
          <p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
          ${company ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>` : ''}
          ${country ? `<p><strong>Country / Timezone:</strong> ${escapeHtml(country)} · ${escapeHtml(timezone || 'UTC')}</p>` : ''}
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
        </div>
      `,
    });

    return res.status(200).json({ notified: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Notification failed';
    return res.status(200).json({ notified: false, error: errMsg });
  }
}
