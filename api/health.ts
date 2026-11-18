import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  return res.status(200).json({
    ok: true,
    supabaseConfigured: Boolean(supabaseUrl && supabaseAnon),
    resendConfigured: Boolean(resendKey && resendKey !== 'MY_RESEND_API_KEY'),
  });
}
