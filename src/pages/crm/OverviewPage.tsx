import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, Plus } from 'lucide-react';
import { useAuthWorkspace } from '../../contexts/AuthWorkspaceContext';
import { supabase } from '../../lib/supabase';
import {
  convertCurrencyReference,
  formatCurrency,
  formatInTimezone,
} from '../../lib/intl';
import type { Activity, Deal, PipelineStage, TaskItem } from '../../types/crm';

export default function OverviewPage() {
  const { activeWorkspace, userTimezone } = useAuthWorkspace();
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contactCount, setContactCount] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function fetchOverview() {
      if (!supabase || !activeWorkspace) {
        setLoading(false);
        return;
      }
      setLoading(true);

      const wsId = activeWorkspace.id;
      const [stagesRes, dealsRes, tasksRes, activitiesRes, contactsRes, companiesRes] =
        await Promise.all([
          supabase
            .from('pipeline_stages')
            .select('*')
            .eq('workspace_id', wsId)
            .order('position', { ascending: true }),
          supabase.from('deals').select('*').eq('workspace_id', wsId),
          supabase
            .from('tasks')
            .select('*, contact:contacts(id, first_name, last_name)')
            .eq('workspace_id', wsId)
            .in('status', ['pending', 'in_progress'])
            .order('due_at', { ascending: true })
            .limit(6),
          supabase
            .from('activities')
            .select('*, actor:profiles!actor_id(id, full_name, email)')
            .eq('workspace_id', wsId)
            .order('occurred_at', { ascending: false })
            .limit(8),
          supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId),
          supabase.from('companies').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId),
        ]);

      if (!active) return;
      setStages((stagesRes.data || []) as PipelineStage[]);
      setDeals((dealsRes.data || []) as Deal[]);
      setTasks((tasksRes.data || []) as unknown as TaskItem[]);
      setActivities((activitiesRes.data || []) as unknown as Activity[]);
      setContactCount(contactsRes.count || 0);
      setCompanyCount(companiesRes.count || 0);
      setLoading(false);
    }

    fetchOverview();
    return () => {
      active = false;
    };
  }, [activeWorkspace]);

  if (!activeWorkspace) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        No active workspace selected.
      </div>
    );
  }

  const baseCurrency = activeWorkspace.default_currency || 'INR';
  const stageMap = new Map(stages.map((s) => [s.id, s]));

  let openPipelineTotal = 0;
  let weightedPipelineTotal = 0;
  let wonTotal = 0;
  let openDealCount = 0;

  for (const deal of deals) {
    const stage = stageMap.get(deal.stage_id);
    const converted = convertCurrencyReference(Number(deal.amount || 0), deal.currency, baseCurrency);
    if (stage?.is_won) {
      wonTotal += converted;
    } else if (!stage?.is_lost) {
      openDealCount += 1;
      openPipelineTotal += converted;
      weightedPipelineTotal += converted * ((stage?.win_probability ?? 20) / 100);
    }
  }

  const isBrandNewWorkspace =
    contactCount === 0 && companyCount === 0 && deals.length === 0 && tasks.length === 0;

  const maxStageAmount = Math.max(
    1,
    ...stages.map((st) =>
      deals
        .filter((d) => d.stage_id === st.id)
        .reduce(
          (acc, d) => acc + convertCurrencyReference(Number(d.amount || 0), d.currency, baseCurrency),
          0
        )
    )
  );

  return (
    <div className="space-y-6">
      {/* Top Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            {activeWorkspace.name} Overview
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Consolidated figures in {baseCurrency} · Displayed in your timezone ({userTimezone})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/app/contacts"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Contact</span>
          </Link>
          <Link
            to="/app/deals"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Deal</span>
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Open Pipeline ({openDealCount} deals)
            </div>
            <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(openPipelineTotal, baseCurrency)}
            </div>
            <div className="mt-1 font-mono-num text-xs text-slate-500 dark:text-slate-400">
              Weighted: {formatCurrency(weightedPipelineTotal, baseCurrency)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Closed Won Revenue
            </div>
            <div className="mt-2 font-mono-num text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(wonTotal, baseCurrency)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Confirmed won deals
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Contacts &amp; Companies
            </div>
            <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900 dark:text-white">
              {contactCount.toLocaleString()}
            </div>
            <div className="mt-1 font-mono-num text-xs text-slate-500 dark:text-slate-400">
              {companyCount.toLocaleString()} companies tracked
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Open Follow-Up Tasks
            </div>
            <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900 dark:text-white">
              {tasks.length}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Normalized to {userTimezone}
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Checklist for Real Brand-New Workspaces (Zero Dummy Data) */}
      {!loading && isBrandNewWorkspace && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6 dark:border-blue-900/50 dark:bg-blue-950/20">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Set up your {activeWorkspace.name} workspace
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Your workspace starts completely clean with zero sample data. Complete these steps to
            launch your live sales pipeline:
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Link
              to="/app/contacts"
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <Circle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  1. Add or Import Contacts
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link
              to="/app/deals"
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <Circle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  2. Create First Deal
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link
              to="/app/team"
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <Circle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  3. Invite Team Members
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </div>
      )}

      {/* Pipeline Funnel & Tasks Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Stage Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Pipeline Breakdown by Stage
            </h3>
            <Link
              to="/app/deals"
              className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
            >
              Open Kanban Board
            </Link>
          </div>

          <div className="mt-5 space-y-3.5">
            {stages.map((stage) => {
              const stageDeals = deals.filter((d) => d.stage_id === stage.id);
              const stageTotal = stageDeals.reduce(
                (acc, d) =>
                  acc + convertCurrencyReference(Number(d.amount || 0), d.currency, baseCurrency),
                0
              );
              const widthPct = Math.round((stageTotal / maxStageAmount) * 100);

              return (
                <div key={stage.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                      <span>{stage.name}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono-num text-slate-500 dark:text-slate-400">
                        {stageDeals.length} deals ({stage.win_probability}%)
                      </span>
                    </div>
                    <span className="font-mono-num font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(stageTotal, baseCurrency)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(stageDeals.length > 0 ? 4 : 0, widthPct)}%`,
                        backgroundColor: stage.color_hex || '#2563EB',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Upcoming Tasks
            </h3>
            <Link
              to="/app/tasks"
              className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
            >
              View All Tasks
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
              <CheckCircle2 className="mx-auto h-7 w-7 text-slate-400" />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                No pending follow-ups scheduled.
              </p>
              <Link
                to="/app/tasks"
                className="mt-3 inline-block text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
              >
                Schedule a task
              </Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
              {tasks.map((task) => (
                <li key={task.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {task.title}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="capitalize">{task.task_type.replace('_', ' ')}</span>
                        {task.contact && (
                          <>
                            {' · '}
                            {task.contact.first_name} {task.contact.last_name || ''}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="font-mono-num text-right text-[11px] text-slate-500 dark:text-slate-400">
                      {formatInTimezone(task.due_at, userTimezone, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent Workspace Activity */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Recent Workspace Activity
        </h3>
        {activities.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Calls, notes, stage transitions, and logged emails will appear here in chronological
            order.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
            {activities.map((act) => (
              <div
                key={act.id}
                className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {act.subject}
                  </div>
                  {act.body && (
                    <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      {act.body}
                    </div>
                  )}
                </div>
                <div className="font-mono-num text-xs text-slate-500 shrink-0 dark:text-slate-400">
                  {act.actor?.full_name || 'Team'} · {formatInTimezone(act.occurred_at, userTimezone)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
