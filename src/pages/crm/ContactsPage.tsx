import React, { useCallback, useEffect, useState } from 'react';
import {
  Clock,
  Download,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAuthWorkspace } from '../../contexts/AuthWorkspaceContext';
import { Modal } from '../../components/Modal';
import { supabase } from '../../lib/supabase';
import {
  formatInTimezone,
  getCurrentTimeInTimezone,
  GLOBAL_TIMEZONES,
} from '../../lib/intl';
import type {
  Activity,
  ActivityType,
  Company,
  Contact,
  LeadStatus,
  LifecycleStage,
} from '../../types/crm';

export default function ContactsPage() {
  const { activeWorkspace, user, userTimezone, activeRole } = useAuthWorkspace();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');

  // Create / Edit Contact Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [lifecycleStage, setLifecycleStage] = useState<LifecycleStage>('lead');
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('new');
  const [leadSource, setLeadSource] = useState('Direct');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Contact 360 Slide-Over Drawer
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactActivities, setContactActivities] = useState<Activity[]>([]);
  const [actType, setActType] = useState<ActivityType>('note');
  const [actSubject, setActSubject] = useState('');
  const [actBody, setActBody] = useState('');
  const [loggingActivity, setLoggingActivity] = useState(false);

  // CSV Import Modal
  const [importOpen, setImportOpen] = useState(false);
  const [csvMessage, setCsvMessage] = useState<string | null>(null);

  const canEdit = activeRole !== 'viewer';
  const canDelete = activeRole === 'owner' || activeRole === 'admin' || activeRole === 'manager';

  const loadContacts = useCallback(async () => {
    if (!supabase || !activeWorkspace) return;
    setLoading(true);
    const wsId = activeWorkspace.id;

    const [contRes, compRes] = await Promise.all([
      supabase
        .from('contacts')
        .select('*, company:companies(id, name)')
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: false }),
      supabase.from('companies').select('id, name').eq('workspace_id', wsId).order('name'),
    ]);

    setContacts((contRes.data || []) as unknown as Contact[]);
    setCompanies((compRes.data || []) as Company[]);
    setLoading(false);
  }, [activeWorkspace]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const loadContactActivities = async (contactId: string) => {
    if (!supabase || !activeWorkspace) return;
    const { data } = await supabase
      .from('activities')
      .select('*, actor:profiles!actor_id(id, full_name, email)')
      .eq('workspace_id', activeWorkspace.id)
      .eq('contact_id', contactId)
      .order('occurred_at', { ascending: false });
    setContactActivities((data || []) as unknown as Activity[]);
  };

  const openDrawer = (c: Contact) => {
    setSelectedContact(c);
    loadContactActivities(c.id);
  };

  const openCreateModal = () => {
    setEditingContact(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setWhatsappNumber('');
    setJobTitle('');
    setCompanyId('');
    setLifecycleStage('lead');
    setLeadStatus('new');
    setLeadSource('Direct');
    setTimezone(activeWorkspace?.default_timezone || 'Asia/Kolkata');
    setCity('');
    setCountry('India');
    setNotes('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (c: Contact) => {
    setEditingContact(c);
    setFirstName(c.first_name);
    setLastName(c.last_name || '');
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setWhatsappNumber(c.whatsapp_number || '');
    setJobTitle(c.job_title || '');
    setCompanyId(c.company_id || '');
    setLifecycleStage(c.lifecycle_stage);
    setLeadStatus(c.lead_status);
    setLeadSource(c.lead_source || 'Direct');
    setTimezone(c.timezone || 'Asia/Kolkata');
    setCity(c.city || '');
    setCountry(c.country || 'India');
    setNotes(c.notes || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !activeWorkspace || !user) return;
    if (!firstName.trim()) {
      setFormError('First name is required.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      workspace_id: activeWorkspace.id,
      first_name: firstName.trim(),
      last_name: lastName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      whatsapp_number: whatsappNumber.trim() || null,
      job_title: jobTitle.trim() || null,
      company_id: companyId || null,
      lifecycle_stage: lifecycleStage,
      lead_status: leadStatus,
      lead_source: leadSource.trim() || 'Direct',
      timezone,
      city: city.trim() || null,
      country: country.trim() || 'India',
      notes: notes.trim() || null,
    };

    if (editingContact) {
      const { error } = await supabase.from('contacts').update(payload).eq('id', editingContact.id);
      if (error) {
        setFormError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('contacts').insert({
        ...payload,
        owner_id: user.id,
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
    loadContacts();
  };

  const handleDeleteContact = async (id: string) => {
    if (!supabase || !canDelete) return;
    await supabase.from('contacts').delete().eq('id', id);
    if (selectedContact?.id === id) setSelectedContact(null);
    setModalOpen(false);
    loadContacts();
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !activeWorkspace || !user || !selectedContact || !actSubject.trim()) return;
    setLoggingActivity(true);

    await supabase.from('activities').insert({
      workspace_id: activeWorkspace.id,
      contact_id: selectedContact.id,
      company_id: selectedContact.company_id || null,
      actor_id: user.id,
      activity_type: actType,
      subject: actSubject.trim(),
      body: actBody.trim() || null,
      actor_timezone: userTimezone,
    });

    await supabase
      .from('contacts')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', selectedContact.id);

    setActSubject('');
    setActBody('');
    setLoggingActivity(false);
    loadContactActivities(selectedContact.id);
  };

  const handleExportCsv = () => {
    const headers = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'whatsapp_number',
      'job_title',
      'lifecycle_stage',
      'lead_status',
      'timezone',
      'city',
      'country',
    ];
    const escapeCell = (val: string | null | undefined) => {
      const s = String(val ?? '');
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = contacts.map((c) =>
      [
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.whatsapp_number,
        c.job_title,
        c.lifecycle_stage,
        c.lead_status,
        c.timezone,
        c.city,
        c.country,
      ]
        .map(escapeCell)
        .join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeWorkspace?.slug || 'yourbiz'}-contacts.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase || !activeWorkspace || !user) return;
    setCsvMessage(null);

    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      setCsvMessage('CSV must include a header row and at least one contact row.');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
    const idx = (name: string) => headers.indexOf(name);
    const fIdx = idx('first_name');
    if (fIdx === -1) {
      setCsvMessage('CSV must contain a "first_name" column.');
      return;
    }

    const rowsToInsert = lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      return {
        workspace_id: activeWorkspace.id,
        first_name: cols[fIdx] || 'Unnamed',
        last_name: idx('last_name') >= 0 ? cols[idx('last_name')] || null : null,
        email: idx('email') >= 0 ? cols[idx('email')] || null : null,
        phone: idx('phone') >= 0 ? cols[idx('phone')] || null : null,
        job_title: idx('job_title') >= 0 ? cols[idx('job_title')] || null : null,
        timezone:
          idx('timezone') >= 0 && cols[idx('timezone')]
            ? cols[idx('timezone')]
            : activeWorkspace.default_timezone,
        country: idx('country') >= 0 && cols[idx('country')] ? cols[idx('country')] : 'India',
        owner_id: user.id,
        created_by: user.id,
      };
    });

    const { error } = await supabase.from('contacts').insert(rowsToInsert);
    if (error) {
      setCsvMessage(`Import failed: ${error.message}`);
      return;
    }

    setCsvMessage(`Successfully imported ${rowsToInsert.length} contacts.`);
    loadContacts();
  };

  const filtered = contacts.filter((c) => {
    if (stageFilter !== 'all' && c.lifecycle_stage !== stageFilter) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      `${c.first_name} ${c.last_name || ''}`.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.company?.name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
            {(['all', 'lead', 'mql', 'sql', 'customer'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStageFilter(st)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition-colors whitespace-nowrap shrink-0 ${
                  stageFilter === st
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={contacts.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => {
                  setCsvMessage(null);
                  setImportOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Import CSV</span>
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                <span>Add Contact</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Contacts Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="space-y-2 p-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              No contacts match your view
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Add your first lead or customer, or import an existing CSV spreadsheet.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                Add First Contact
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <th className="px-4 py-3">Name &amp; Title</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Email &amp; Phone</th>
                  <th className="px-4 py-3">Stage · Status</th>
                  <th className="px-4 py-3">Contact Local Time</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openDrawer(c)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {c.first_name} {c.last_name || ''}
                      </div>
                      {c.job_title && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {c.job_title}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {c.company?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-700 dark:text-slate-300">
                        {c.email || '—'}
                      </div>
                      <div className="font-mono-num text-xs text-slate-500 dark:text-slate-400">
                        {c.phone || c.whatsapp_number || ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold uppercase">{c.lifecycle_stage}</span>
                      <span className="mx-1.5 text-slate-400">·</span>
                      <span className="capitalize">{c.lead_status}</span>
                    </td>
                    <td className="px-4 py-3 font-mono-num text-xs text-slate-600 dark:text-slate-400">
                      {getCurrentTimeInTimezone(c.timezone || 'Asia/Kolkata')}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contact 360 Slide-Over Drawer */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {selectedContact.first_name} {selectedContact.last_name || ''}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedContact.job_title || 'Contact'}
                  {selectedContact.company ? ` at ${selectedContact.company.name}` : ''} ·{' '}
                  <span className="uppercase">{selectedContact.lifecycle_stage}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Quick Contact Channels */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>{selectedContact.email || 'No email recorded'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Phone className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="font-mono-num">
                    {selectedContact.phone || 'No phone recorded'}
                  </span>
                </div>
                {selectedContact.whatsapp_number && (
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <a
                      href={`https://wa.me/${selectedContact.whatsapp_number.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono-num underline"
                    >
                      WhatsApp: {selectedContact.whatsapp_number}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="font-mono-num">
                    Their local time ({selectedContact.timezone}):{' '}
                    {getCurrentTimeInTimezone(selectedContact.timezone)}
                  </span>
                </div>
              </div>

              {/* Log Activity Form */}
              {canEdit && (
                <form
                  onSubmit={handleLogActivity}
                  className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Log Activity or Note
                    </span>
                    <select
                      value={actType}
                      onChange={(e) => setActType(e.target.value as ActivityType)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="note">Note</option>
                      <option value="call">Phone Call</option>
                      <option value="email">Email</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="meeting">Meeting</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    value={actSubject}
                    onChange={(e) => setActSubject(e.target.value)}
                    placeholder="Summary (e.g., Discussed Q4 pricing & GST quote)"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <textarea
                    rows={2}
                    value={actBody}
                    onChange={(e) => setActBody(e.target.value)}
                    placeholder="Detailed notes..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={loggingActivity}
                    className="rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                  >
                    {loggingActivity ? 'Logging...' : 'Save to Timeline'}
                  </button>
                </form>
              )}

              {/* Timeline */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Activity Timeline
                </h3>
                {contactActivities.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    No logged activities yet for this contact.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {contactActivities.map((act) => (
                      <div
                        key={act.id}
                        className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold capitalize text-blue-700 dark:text-blue-400">
                            {act.activity_type.replace('_', ' ')}
                          </span>
                          <span className="font-mono-num text-[11px] text-slate-400">
                            {formatInTimezone(act.occurred_at, userTimezone)}
                          </span>
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                          {act.subject}
                        </div>
                        {act.body && (
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            {act.body}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Contact Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingContact ? 'Edit Contact' : 'Add Contact'}
      >
        <form onSubmit={handleSaveContact} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                WhatsApp Number
              </label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+9198..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="VP Procurement"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Company
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
                Lifecycle Stage
              </label>
              <select
                value={lifecycleStage}
                onChange={(e) => setLifecycleStage(e.target.value as LifecycleStage)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="lead">Lead</option>
                <option value="mql">MQL</option>
                <option value="sql">SQL</option>
                <option value="customer">Customer</option>
                <option value="evangelist">Evangelist</option>
                <option value="churned">Churned</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Lead Status
              </label>
              <select
                value={leadStatus}
                onChange={(e) => setLeadStatus(e.target.value as LeadStatus)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="nurturing">Nurturing</option>
                <option value="unqualified">Unqualified</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Contact Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
                City / Country
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-1/2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country"
                  className="w-1/2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {editingContact && canDelete ? (
              <button
                type="button"
                onClick={() => handleDeleteContact(editingContact.id)}
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
                {saving ? 'Saving...' : editingContact ? 'Save Changes' : 'Create Contact'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Contacts from CSV"
        subtitle="Upload a CSV with header row (required column: first_name; optional: last_name, email, phone, job_title, timezone, country)."
      >
        <div className="space-y-4">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvFileUpload}
            className="block w-full rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"
          />
          {csvMessage && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
              {csvMessage}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
