import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  Check,
  CheckSquare,
  ChevronDown,
  Clock,
  FileText,
  HelpCircle,
  Kanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Plus,
  Settings,
  Sun,
  Users,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuthWorkspace } from '../contexts/AuthWorkspaceContext';
import { useTheme } from '../contexts/ThemeContext';
import { ConfigNotice } from './ConfigNotice';
import { Modal } from './Modal';
import {
  COUNTRY_PRESETS,
  getCurrentTimeInTimezone,
  GLOBAL_TIMEZONES,
  SUPPORTED_CURRENCIES,
} from '../lib/intl';

const NAV_ITEMS = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/deals', label: 'Deals & Pipeline', icon: Kanban, end: false },
  { to: '/app/contacts', label: 'Contacts & Leads', icon: Users, end: false },
  { to: '/app/companies', label: 'Companies', icon: Building2, end: false },
  { to: '/app/tasks', label: 'Tasks', icon: CheckSquare, end: false },
  { to: '/app/products', label: 'Products', icon: Package, end: false },
  { to: '/app/quotes', label: 'Quotes & Invoices', icon: FileText, end: false },
  { to: '/app/team', label: 'Team & Invites', icon: UserCheck, end: false },
  { to: '/app/settings', label: 'Settings & Billing', icon: Settings, end: false },
];

export default function AppShell() {
  const {
    user,
    profile,
    memberships,
    activeWorkspace,
    activeRole,
    pendingInvitesForMe,
    loading,
    configMissing,
    userTimezone,
    switchWorkspace,
    createWorkspace,
    acceptInviteByToken,
    signOut,
  } = useAuthWorkspace();

  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [clockTick, setClockTick] = useState(0);

  // Create Workspace Form
  const [newWsName, setNewWsName] = useState('');
  const [newWsCountry, setNewWsCountry] = useState('IN');
  const [newWsCurrency, setNewWsCurrency] = useState('INR');
  const [newWsTimezone, setNewWsTimezone] = useState(userTimezone);
  const [newWsTaxId, setNewWsTaxId] = useState('');
  const [creatingWs, setCreatingWs] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((t) => t + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setWsError(null);
    if (!newWsName.trim()) {
      setWsError('Workspace name is required.');
      return;
    }
    setCreatingWs(true);
    const { error } = await createWorkspace({
      name: newWsName.trim(),
      currency: newWsCurrency,
      timezone: newWsTimezone,
      countryCode: newWsCountry,
      gstOrTaxId: newWsTaxId.trim() || undefined,
    });
    setCreatingWs(false);
    if (error) {
      setWsError(error);
      return;
    }
    setNewWsName('');
    setNewWsTaxId('');
    setCreateWsOpen(false);
    setSwitcherOpen(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0B0F17]">
        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Loading workspace...
        </div>
      </div>
    );
  }

  if (configMissing) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 dark:bg-[#0B0F17]">
        <div className="mx-auto max-w-2xl space-y-6 pt-12">
          <div className="flex items-center justify-between">
            <Link to="/" className="font-display text-xl font-bold text-slate-900 dark:text-white">
              YourBiz CRM
            </Link>
            <Link
              to="/"
              className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
            >
              Back to Home
            </Link>
          </div>
          <ConfigNotice />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-[#0B0F17]">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Sign in to access YourBiz CRM
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Your workspace data is protected with session authentication and Row-Level Security.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              to="/login"
              className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Create Free Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Re-evaluated every 30s via clockTick
  void clockTick;
  const userClock = getCurrentTimeInTimezone(userTimezone);
  const wsTimezone = activeWorkspace?.default_timezone || userTimezone;
  const wsClock = getCurrentTimeInTimezone(wsTimezone);
  const showDualClock = wsTimezone !== userTimezone;

  const currentNavTitle =
    NAV_ITEMS.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    )?.label || 'Workspace';

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Brand + Workspace Switcher */}
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <Link
              to="/app"
              className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white"
            >
              YourBiz CRM
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-1 text-slate-500 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative mt-3">
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {activeWorkspace?.name || 'Select Workspace'}
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {activeWorkspace?.default_currency || 'INR'} ·{' '}
                  <span className="capitalize">{activeRole || 'member'}</span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            </button>

            {switcherOpen && (
              <div className="absolute left-0 right-0 z-30 mt-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                  Your Workspaces
                </div>
                <div className="max-h-56 space-y-0.5 overflow-y-auto">
                  {memberships.map((m) => {
                    const isSelected = m.workspace_id === activeWorkspace?.id;
                    return (
                      <button
                        key={m.workspace_id}
                        type="button"
                        onClick={() => {
                          switchWorkspace(m.workspace_id);
                          setSwitcherOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                          isSelected
                            ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate">{m.workspace?.name}</div>
                          <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                            {m.workspace?.default_currency} · <span className="capitalize">{m.role}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {pendingInvitesForMe.length > 0 && (
                  <div className="mt-1.5 border-t border-slate-200 pt-1.5 dark:border-slate-800">
                    <div className="px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      Pending Invites
                    </div>
                    {pendingInvitesForMe.map((inv) => (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={async () => {
                          await acceptInviteByToken(inv.token);
                          setSwitcherOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-amber-50 dark:text-slate-200 dark:hover:bg-amber-950/40"
                      >
                        <span className="truncate">Join {inv.workspace?.name}</span>
                        <span className="font-semibold text-blue-700 dark:text-blue-400">Accept</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-1.5 border-t border-slate-200 pt-1.5 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSwitcherOpen(false);
                      setCreateWsOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create New Workspace</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Sign Out */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="truncate text-xs font-semibold text-slate-900 dark:text-white">
            {profile?.full_name || user.email}
          </div>
          <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {user.email}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-200 pt-2 dark:border-slate-800">
            <Link
              to="/queries"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Support</span>
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">
        <div className="sticky top-0 h-screen overflow-y-auto">{sidebarContent}</div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 h-full w-72 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden dark:border-slate-800 dark:text-slate-200"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden font-medium text-slate-500 sm:inline dark:text-slate-400">
                {activeWorkspace?.name || 'Workspace'}
              </span>
              <span className="hidden text-slate-300 sm:inline dark:text-slate-700">/</span>
              <h1 className="truncate font-display font-bold text-slate-900 dark:text-white">
                {currentNavTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex dark:text-slate-400">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              <span className="font-mono-num">You: {userClock}</span>
              {showDualClock && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">WS: {wsClock}</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      {/* Create Workspace Modal */}
      <Modal
        open={createWsOpen}
        onClose={() => setCreateWsOpen(false)}
        title="Create New Workspace"
        subtitle="Each workspace keeps its own contacts, deals, pipeline stages, currency, and team."
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Workspace Name *
            </label>
            <input
              type="text"
              required
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="e.g., North America Enterprise Sales"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Country
              </label>
              <select
                value={newWsCountry}
                onChange={(e) => {
                  const code = e.target.value;
                  setNewWsCountry(code);
                  const preset = COUNTRY_PRESETS.find((c) => c.code === code);
                  if (preset) {
                    setNewWsCurrency(preset.currency);
                    setNewWsTimezone(preset.timezone);
                  }
                }}
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
                Default Currency
              </label>
              <select
                value={newWsCurrency}
                onChange={(e) => setNewWsCurrency(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {SUPPORTED_CURRENCIES.map((cur) => (
                  <option key={cur.code} value={cur.code}>
                    {cur.code} ({cur.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Workspace Base Timezone
            </label>
            <select
              value={newWsTimezone}
              onChange={(e) => setNewWsTimezone(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {GLOBAL_TIMEZONES.map((tz) => (
                <option key={tz.iana} value={tz.iana}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              GSTIN / Tax ID (Optional)
            </label>
            <input
              type="text"
              value={newWsTaxId}
              onChange={(e) => setNewWsTaxId(e.target.value)}
              placeholder="29ABCDE1234F1Z5"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {wsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {wsError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateWsOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingWs}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {creatingWs ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
