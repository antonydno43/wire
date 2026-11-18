import { Resend } from 'resend';

function getAppBaseUrl(reqHost?: string, reqProto?: string): string {
  const configured = process.env.APP_URL || process.env.VITE_APP_URL;
  if (configured && configured !== 'MY_APP_URL') {
    return configured.replace(/\/+$/, '');
  }
  if (reqHost) {
    const proto = reqProto || (reqHost.includes('localhost') ? 'http' : 'https');
    return `${proto}://${reqHost}`;
  }
  return 'http://localhost:3000';
}

export function getResendClient(): { client: Resend | null; from: string } {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'YourBiz CRM <onboarding@resend.dev>';
  if (!apiKey || apiKey === 'MY_RESEND_API_KEY') {
    return { client: null, from };
  }
  return { client: new Resend(apiKey), from };
}

export async function verifySupabaseAuthHeader(authHeader?: string): Promise<{ id: string; email: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || !token) {
    return null;
  }

  try {
    const resp = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseKey,
      },
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { id?: string; email?: string };
    if (!data.id || !data.email) return null;
    return { id: data.id, email: data.email };
  } catch {
    return null;
  }
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildInviteEmailHtml(params: {
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteToken: string;
  workspaceTimezone: string;
  reqHost?: string;
  reqProto?: string;
}): { subject: string; html: string; inviteUrl: string } {
  const baseUrl = getAppBaseUrl(params.reqHost, params.reqProto);
  const inviteUrl = `${baseUrl}/invite/${encodeURIComponent(params.inviteToken)}`;
  const safeInviter = escapeHtml(params.inviterName);
  const safeWorkspace = escapeHtml(params.workspaceName);
  const safeRole = escapeHtml(params.role.charAt(0).toUpperCase() + params.role.slice(1));
  const safeTz = escapeHtml(params.workspaceTimezone || 'Asia/Kolkata');

  const subject = `${params.inviterName} invited you to join ${params.workspaceName} on YourBiz CRM`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 32px 16px; color: #0f172a;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px;">
        <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 24px;">YourBiz CRM</div>
        <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #0f172a;">Join ${safeWorkspace}</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
          <strong>${safeInviter}</strong> has invited you to collaborate inside the <strong>${safeWorkspace}</strong> workspace as a <strong>${safeRole}</strong>.
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
          Workspace base timezone: <strong>${safeTz}</strong>. Your personal tasks and timestamps will automatically convert to your own local timezone.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
          Review &amp; Join Workspace
        </a>
        <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 24px 0 0;">
          Don't have a YourBiz CRM account yet? Click the button above to create your account in seconds—you will get your own personal workspace and can switch seamlessly into ${safeWorkspace}.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          If the button does not work, copy this link into your browser:<br />
          <span style="color: #334155; word-break: break-all;">${inviteUrl}</span>
        </p>
      </div>
    </div>
  `;

  return { subject, html, inviteUrl };
}

export function buildWelcomeEmailHtml(params: {
  fullName: string;
  workspaceName: string;
  currency: string;
  timezone: string;
  reqHost?: string;
  reqProto?: string;
}): { subject: string; html: string } {
  const baseUrl = getAppBaseUrl(params.reqHost, params.reqProto);
  const appUrl = `${baseUrl}/app`;
  const safeName = escapeHtml(params.fullName);
  const safeWorkspace = escapeHtml(params.workspaceName);
  const safeCurrency = escapeHtml(params.currency);
  const safeTz = escapeHtml(params.timezone);

  const subject = `Welcome to YourBiz CRM — ${params.workspaceName} is ready`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 32px 16px; color: #0f172a;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px;">
        <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 24px;">YourBiz CRM</div>
        <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #0f172a;">Welcome aboard, ${safeName}</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
          Your workspace <strong>${safeWorkspace}</strong> has been created with base currency <strong>${safeCurrency}</strong> and timezone <strong>${safeTz}</strong>.
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
          You can add contacts, track deals across your visual pipeline, issue GST/tax-ready quotes, and invite teammates from anywhere in the world.
        </p>
        <a href="${appUrl}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
          Open Your Workspace
        </a>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          Need help onboarding your team? Visit ${baseUrl}/queries anytime.
        </p>
      </div>
    </div>
  `;

  return { subject, html };
}
