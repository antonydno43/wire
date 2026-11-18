import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, Clock, Plus, Trash2 } from 'lucide-react';
import { useAuthWorkspace } from '../../contexts/AuthWorkspaceContext';
import { Modal } from '../../components/Modal';
import { supabase } from '../../lib/supabase';
import {
  formatInTimezone,
  utcIsoToZonedInput,
  zonedDateTimeToUtcIso,
} from '../../lib/intl';
import type { Contact, Deal, TaskItem, TaskStatus, TaskType, WorkspaceMembership } from '../../types/crm';

export default function TasksPage() {
  const { activeWorkspace, user, userTimezone, activeRole } = useAuthWorkspace();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [members, setMembers] = useState<WorkspaceMembership[]>([]);
  const [filterTab, setFilterTab] = useState<'open' | 'overdue' | 'completed'>('open');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('follow_up');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueLocal, setDueLocal] = useState('');
  const [contactId, setContactId] = useState('');
  const [dealId, setDealId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canEdit = activeRole !== 'viewer';
  const canDelete = activeRole === 'owner' || activeRole === 'admin' || activeRole === 'manager';

  const loadTasks = useCallback(async () => {
    if (!supabase || !activeWorkspace) return;
    setLoading(true);
    const wsId = activeWorkspace.id;

    const [tRes, cRes, dRes, mRes] = await Promise.all([
      supabase
        .from('tasks')
        .select(
          '*, contact:contacts(id, first_name, last_name), deal:deals(id, title), assignee:profiles!assigned_to(id, full_name, preferred_timezone)'
        )
        .eq('workspace_id', wsId)
        .order('due_at', { ascending: true }),
      supabase.from('contacts').select('id, first_name, last_name').eq('workspace_id', wsId).order('first_name'),
      supabase.from('deals').select('id, title').eq('workspace_id', wsId).order('title'),
      supabase
        .from('workspace_members')
        .select('id, user_id, role, profiles(id, full_name, email, preferred_timezone)')
        .eq('workspace_id', wsId),
    ]);

    setTasks((tRes.data || []) as unknown as TaskItem[]);
    setContacts((cRes.data || []) as Contact[]);
    setDeals((dRes.data || []) as Deal[]);
    setMembers((mRes.data || []) as unknown as WorkspaceMembership[]);
    setLoading(false);
  }, [activeWorkspace]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const openCreateModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setTaskType('follow_up');
    setPriority('medium');
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    setDueLocal(utcIsoToZonedInput(tomorrow.toISOString(), userTimezone));
    setContactId('');
    setDealId('');
    setAssignedTo(user?.id || '');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (t: TaskItem) => {
    setEditingTask(t);
    setTitle(t.title);
    setDescription(t.description || '');
    setTaskType(t.task_type);
    setPriority(t.priority);
    setDueLocal(utcIsoToZonedInput(t.due_at, userTimezone));
    setContactId(t.contact_id || '');
    setDealId(t.deal_id || '');
    setAssignedTo(t.assigned_to || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !activeWorkspace || !user) return;
    if (!title.trim()) {
      setFormError('Task title is required.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const dueIso = dueLocal ? zonedDateTimeToUtcIso(dueLocal, userTimezone) : null;

    const payload = {
      workspace_id: activeWorkspace.id,
      title: title.trim(),
      description: description.trim() || null,
      task_type: taskType,
      priority,
      due_at: dueIso,
      creator_timezone: userTimezone,
      contact_id: contactId || null,
      deal_id: dealId || null,
      assigned_to: assignedTo || user.id,
    };

    if (editingTask) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', editingTask.id);
      if (error) {
        setFormError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('tasks').insert({
        ...payload,
        status: 'pending',
        created_by: user.id,
      });
      if (error) {
        setFormError(error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setModalOpen(false);
    loadTasks();
  };

  const toggleStatus = async (task: TaskItem) => {
    if (!supabase || !canEdit) return;
    const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    const completedAt = nextStatus === 'completed' ? new Date().toISOString() : null;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: nextStatus, completed_at: completedAt } : t
      )
    );

    await supabase
      .from('tasks')
      .update({ status: nextStatus, completed_at: completedAt })
      .eq('id', task.id);
  };

  const handleDelete = async (id: string) => {
    if (!supabase || !canDelete) return;
    await supabase.from('tasks').delete().eq('id', id);
    setModalOpen(false);
    loadTasks();
  };

  const nowMs = Date.now();
  const filteredTasks = tasks.filter((t) => {
    if (filterTab === 'completed') return t.status === 'completed';
    if (filterTab === 'overdue') {
      return (
        t.status !== 'completed' &&
        t.status !== 'cancelled' &&
        Boolean(t.due_at && new Date(t.due_at).getTime() < nowMs)
      );
    }
    return t.status === 'pending' || t.status === 'in_progress';
  });

  const wsTimezone = activeWorkspace?.default_timezone || userTimezone;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
          {(
            [
              { id: 'open', label: 'Open Tasks' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'completed', label: 'Completed' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                filterTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Task</span>
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="space-y-2 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              No tasks in this view
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Schedule calls, WhatsApp follow-ups, or demos—automatically synced across every team
              member’s local timezone.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                Schedule First Task
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredTasks.map((t) => {
              const isOverdue =
                t.status !== 'completed' && t.due_at && new Date(t.due_at).getTime() < nowMs;
              return (
                <div
                  key={t.id}
                  className="flex flex-col justify-between gap-3 px-5 py-4 hover:bg-slate-50 sm:flex-row sm:items-center dark:hover:bg-slate-800/40"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => toggleStatus(t)}
                      aria-label={t.status === 'completed' ? 'Mark pending' : 'Mark completed'}
                      className="mt-0.5 text-slate-400 hover:text-emerald-600"
                    >
                      {t.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={() => openEditModal(t)}
                        className={`text-left text-sm font-semibold hover:underline ${
                          t.status === 'completed'
                            ? 'text-slate-400 line-through'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {t.title}
                      </button>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="capitalize">{t.task_type.replace('_', ' ')}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">Priority: {t.priority}</span>
                        {t.contact && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              {t.contact.first_name} {t.contact.last_name || ''}
                            </span>
                          </>
                        )}
                        {t.deal && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Deal: {t.deal.title}</span>
                          </>
                        )}
                        {t.assignee && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Assigned: {t.assignee.full_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start text-xs sm:items-end">
                    <div
                      className={`inline-flex items-center gap-1.5 font-mono-num font-semibold ${
                        isOverdue
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatInTimezone(t.due_at, userTimezone)}</span>
                    </div>
                    {wsTimezone !== userTimezone && t.due_at && (
                      <div className="mt-0.5 font-mono-num text-[11px] text-slate-400">
                        Workspace: {formatInTimezone(t.due_at, wsTimezone)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTask ? 'Edit Task' : 'Schedule Task'}
        subtitle={`Times entered here are interpreted in your timezone (${userTimezone}) and converted to UTC.`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Follow up on proposal pricing"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Type
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="follow_up">Follow-up</option>
                <option value="call">Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="demo">Product Demo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Assign To
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profiles?.full_name || m.profiles?.email || 'Member'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Due Date &amp; Time ({userTimezone})
            </label>
            <input
              type="datetime-local"
              value={dueLocal}
              onChange={(e) => setDueLocal(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono-num text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Related Contact
              </label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name || ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Related Deal
              </label>
              <select
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">None</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {editingTask && canDelete ? (
              <button
                type="button"
                onClick={() => handleDelete(editingTask.id)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
