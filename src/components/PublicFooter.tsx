import { Link } from 'react-router-dom';

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0B0F17]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              YourBiz CRM
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Revenue operations, visual deal pipelines, multi-workspace collaboration, and
              GST-ready commercial workflows built for medium and upper-medium businesses in India
              and worldwide.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Product</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/#features" className="hover:text-slate-900 dark:hover:text-white">
                  Capabilities
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-slate-900 dark:hover:text-white">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-slate-900 dark:hover:text-white">
                  Create Workspace
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-slate-900 dark:hover:text-white">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Support & Legal</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/queries" className="hover:text-slate-900 dark:hover:text-white">
                  Submit a Query
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-slate-900 dark:hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-slate-900 dark:hover:text-white">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center dark:border-slate-800 dark:text-slate-400">
          <span>© {year} YourBiz CRM. All rights reserved.</span>
          <span>Multi-Currency · Cross-Timezone Sync · Row-Level Security</span>
        </div>
      </div>
    </footer>
  );
}
