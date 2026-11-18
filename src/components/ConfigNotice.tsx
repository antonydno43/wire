import { AlertTriangle } from 'lucide-react';

export function ConfigNotice() {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1.5">
          <div className="font-semibold">Supabase Environment Not Configured Yet</div>
          <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
            To connect live authentication and workspace storage, set{' '}
            <code className="font-mono font-medium">VITE_SUPABASE_URL</code> and{' '}
            <code className="font-mono font-medium">VITE_SUPABASE_ANON_KEY</code> in your
            environment variables (or Vercel Project Settings) and run the SQL migrations inside{' '}
            <code className="font-mono font-medium">supabase/migrations/</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
