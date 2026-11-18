import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, Kanban, List, Plus, Search, Trash2 } from 'lucide-react';
import { useAuthWorkspace } from '../../contexts/AuthWorkspaceContext';
import { Modal } from '../../components/Modal';
import { supabase } from '../../lib/supabase';
import {
  convertCurrencyReference,
  formatCurrency,
  SUPPORTED_CURRENCIES,
} from '../../lib/intl';
import type { Company, Contact, Deal, DealPriority, PipelineStage } from '../../types/crm';

export default function DealsPage() {
  const { activeWorkspace, user, userTimezone, activeRole } = useAuthWorkspace();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState('INR');
  const [stageId, setStageId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [contactId, setContactId] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [priority, setPriority] = useState<DealPriority>('medium');
  const [source, setSource] = useState('Inbound');
  const [lostReason, setLostReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canEdit = activeRole !== 'viewer';
  const canDelete = activeRole === 'owner' || activeRole === 'admin' || activeRole === 'manager';

  const loadDealsData = useCallback(async () => {
    if (!supabase || !activeWorkspace) return;
    setLoading(true);
    const wsId = activeWorkspace.id;

    const [stRes, dlRes, compRes, contRes] = await Promise.all([
      supabase
        .from('pipeline_stages')
        .select('*')
        .eq('workspace_id', wsId)
        .order('position', { ascending: true }),
      supabase
        .from('deals')
        .select(
          '*, company:companies(id, name), contact:contacts(id, first_name, last_name, email), owner:profiles!owner_id(id, full_name, preferred_timezone)'
        )
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: false }),
      supabase.from('companies').select('id, name').eq('workspace_id', wsId).order('name'),
      supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('workspace_id', wsId)
        .order('first_name'),
    ]);

    const loadedStages = (stRes.data || []) as PipelineStage[];
    setStages(loadedStages);
    setDeals((dlRes.data || []) as unknown as Deal[]);
    setCompanies((compRes.data || []) as Company[]);
    setContacts((contRes.data || []) as Contact[]);
    if (loadedStages.length > 0 && !stageId) {
      setStageId(loadedStages[0].id);
    }
    setLoading(false);
  }, [activeWorkspace, stageId]);

  useEffect(() => {
    loadDealsData();
  }, [loadDealsData]);

  const openCreateModal = (presetStageId?: string) => {
    setEditingDeal(null);
    setTitle('');
    setAmount('');
    setCurrency(activeWorkspace?.default_currency || 'INR');
    setStageId(presetStageId || stages[0]?.id || '');
    setCompanyId('');
    setContactId('');
    setExpectedCloseDate('');
    setPriority('medium');
    setSource('Inbound');
    setLostReason('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (deal: Deal) => {
    setEditingDeal(deal);
    setTitle(deal.title);
    setAmount(String(deal.amount ?? 0));
    setCurrency(deal.currency || activeWorkspace?.default_currency || 'INR');
    setStageId(deal.stage_id);
    setCompanyId(deal.company_id || '');
    setContactId(deal.contact_id || '');
    setExpectedCloseDate(deal.expected_close_date || '');
    setPriority(deal.priority || 'medium');
    setSource(deal.source || 'Inbound');
    setLostReason(deal.lost_reason || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !activeWorkspace || !user) return;
    if (!title.trim() || !stageId) {
      setFormError('Deal title and pipeline stage are required.');
      return;
    }

    setSaving(true);
    setFormError(null);
    const targetStage = stages.find((s) => s.id === stageId);
    const isClosed = Boolean(targetStage?.is_won || targetStage?.is_lost);

    const payload = {
      workspace_id: activeWorkspace.id,
      title: title.trim(),
      amount: parseFloat(amount) || 0,
      currency,
      stage_id: stageId,
      company_id: companyId || null,
      contact_id: contactId || null,
      expected_close_date: expectedCloseDate || null,
      priority,
      source: source.trim() || 'Inbound',
      lost_reason: targetStage?.is_lost ? lostReason.trim() || null : null,
      closed_at: isClosed ? new Date().toISOString() : null,
    };

    if (editingDeal) {
      const { error } = await supabase.from('deals').update(payload).eq('id', editingDeal.id);
      if (error) {
        setFormError(error.message);
        setSaving(false);
        return;
      }
      if (editingDeal.stage_id !== stageId) {
        await supabase.from('activities').insert({
          workspace_id: activeWorkspace.id,
          deal_id: editingDeal.id,
          contact_id: contactId || null,
          company_id: companyId || null,
          actor_id: user.id,
          activity_type: 'stage_change',
          subject: `Moved "${title.trim()}" to ${targetStage?.name || 'new stage'}`,
          actor_timezone: userTimezone,
        });
      }
    } else {
      const { data: inserted, error } = await supabase
        .from('deals')
        .insert({
          ...payload,
          owner_id: user.id,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (error) {
        setFormError(error.message);
        setSaving(false);
        return;
      }

      if (inserted?.id) {
        await supabase.from('activities').insert({
          workspace_id: activeWorkspace.id,
          deal_id: inserted.id,
          contact_id: contactId || null,
          company_id: companyId || null,
          actor_id: user.id,
          activity_type: 'system',
          subject: `Created deal "${title.trim()}" (${formatCurrency(payload.amount, currency)})`,
          actor_timezone: userTimezone,
        });
      }
    }

    setSaving(false);
    setModalOpen(false);
    loadDealsData();
  };

  const handleMoveStage = async (deal: Deal, newStageId: string) => {
    if (!supabase || !activeWorkspace || !user || !canEdit || deal.stage_id === newStageId) return;
    const targetStage = stages.find((s) => s.id === newStageId);
    const isClosed = Boolean(targetStage?.is_won || targetStage?.is_lost);

    // Optimistic UI update
    setDeals((prev) =>
      prev.map((d) =>
        d.id === deal.id
          ? { ...d, stage_id: newStageId, closed_at: isClosed ? new Date().toISOString() : null }
          : d
      )
    );

    await supabase
      .from('deals')
      .update({
        stage_id: newStageId,
        closed_at: isClosed ? new Date().toISOString() : null,
      })
      .eq('id', deal.id);

    await supabase.from('activities').insert({
      workspace_id: activeWorkspace.id,
      deal_id: deal.id,
      contact_id: deal.contact_id || null,
      company_id: deal.company_id || null,
      actor_id: user.id,
      activity_type: 'stage_change',
      subject: `Deal "${deal.title}" moved to ${targetStage?.name || 'stage'}`,
      actor_timezone: userTimezone,
    });
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!supabase || !canDelete) return;
    await supabase.from('deals').delete().eq('id', dealId);
    setModalOpen(false);
    loadDealsData();
  };

  const filteredDeals = deals.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      d.title.toLowerCase().includes(q) ||
      (d.company?.name || '').toLowerCase().includes(q) ||
      `${d.contact?.first_name || ''} ${d.contact?.last_name || ''}`.toLowerCase().includes(q)
    );
  });

  const baseCurrency = activeWorkspace?.default_currency || 'INR';

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deals, companies..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              <span>New Deal</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const colDeals = filteredDeals.filter((d) => d.stage_id === stage.id);
            const colTotal = colDeals.reduce(
              (sum, d) =>
                sum + convertCurrencyReference(Number(d.amount || 0), d.currency, baseCurrency),
              0
            );

            return (
              <div
                key={stage.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedDealId) {
                    const dragged = deals.find((d) => d.id === draggedDealId);
                    if (dragged) handleMoveStage(dragged, stage.id);
                    setDraggedDealId(null);
                  }
                }}
                className="flex w-72 shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-100/70 p-3 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="mb-3 flex items-start justify-between gap-2 px-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: stage.color_hex }}
                      />
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {stage.name}
                      </span>
                    </div>
                    <div className="mt-1 font-mono-num text-xs text-slate-500 dark:text-slate-400">
                      {colDeals.length} deals · {formatCurrency(colTotal, baseCurrency)}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openCreateModal(stage.id)}
                      aria-label={`Add deal to ${stage.name}`}
                      className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-2.5">
                  {colDeals.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300/80 py-8 text-center text-xs text-slate-400 dark:border-slate-700">
                      Drop deal here
                    </div>
                  ) : (
                    colDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable={canEdit}
                        onDragStart={() => setDraggedDealId(deal.id)}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-600"
                        onClick={() => openEditModal(deal)}
                      >
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {deal.title}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {deal.company?.name ||
                            (deal.contact
                              ? `${deal.contact.first_name} ${deal.contact.last_name || ''}`
                              : 'Unlinked account')}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="font-mono-num text-sm font-bold text-slate-900 dark:text-white">
                            {formatCurrency(deal.amount, deal.currency)}
                          </span>
                          <span className="text-[11px] font-medium capitalize text-slate-500 dark:text-slate-400">
                            {deal.priority}
                          </span>
                        </div>
                        {deal.expected_close_date && (
                          <div className="mt-2 flex items-center gap-1.5 font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
                            <Calendar className="h-3 w-3" />
                            <span>Close: {deal.expected_close_date}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {filteredDeals.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-900 dark:text-white">No deals found</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Create your first opportunity to track revenue across stages.
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => openCreateModal()}
                  className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Create First Deal
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                    <th className="px-4 py-3">Deal Title</th>
                    <th className="px-4 py-3">Account / Contact</th>
                    <th className="px-4 py-3">Stage</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Expected Close</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredDeals.map((deal) => {
                    const st = stages.find((s) => s.id === deal.stage_id);
                    return (
                      <tr
                        key={deal.id}
                        onClick={() => openEditModal(deal)}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          {deal.title}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {deal.company?.name ||
                            (deal.contact
                              ? `${deal.contact.first_name} ${deal.contact.last_name || ''}`
                              : '—')}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            disabled={!canEdit}
                            value={deal.stage_id}
                            onChange={(e) => handleMoveStage(deal, e.target.value)}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                          >
                            {stages.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <span className="ml-2 text-xs text-slate-400">
                            {st?.win_probability}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono-num font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(deal.amount, deal.currency)}
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-300">
                          {deal.priority}
                        </td>
                        <td className="px-4 py-3 font-mono-num text-xs text-slate-500 dark:text-slate-400">
                          {deal.expected_close_date || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Deal Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDeal ? 'Edit Deal' : 'Create New Deal'}
        subtitle="Deals support multi-currency amounts and link directly to companies and contacts."
      >
        <form onSubmit={handleSaveDeal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Deal Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Annual Enterprise Fleet License"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Deal Value
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono-num text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pipeline Stage *
              </label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.win_probability}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Expected Close Date
              </label>
              <input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Company
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">None</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Primary Contact
              </label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name || ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as DealPriority)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Deal Source
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Inbound, Referral, Outbound..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {stages.find((s) => s.id === stageId)?.is_lost && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Closed Lost Reason
              </label>
              <input
                type="text"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Budget freeze, Competitor pricing, Timing..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          )}

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {editingDeal && canDelete ? (
              <button
                type="button"
                onClick={() => handleDeleteDeal(editingDeal.id)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Deal</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              {canEdit && (
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingDeal ? 'Save Changes' : 'Create Deal'}
                </button>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
