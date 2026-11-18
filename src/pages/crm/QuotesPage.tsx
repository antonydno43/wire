import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Printer, Trash2 } from 'lucide-react';
import { useAuthWorkspace } from '../../contexts/AuthWorkspaceContext';
import { Modal } from '../../components/Modal';
import { supabase } from '../../lib/supabase';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../../lib/intl';
import type { Company, Contact, InvoiceQuote, Product, QuoteLineItem } from '../../types/crm';

export default function QuotesPage() {
  const { activeWorkspace, user, activeRole } = useAuthWorkspace();
  const [docs, setDocs] = useState<InvoiceQuote[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Builder Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [docType, setDocType] = useState<'quote' | 'invoice'>('quote');
  const [docNumber, setDocNumber] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [contactId, setContactId] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([
    { name: '', hsn_sac_code: '', quantity: 1, unit_price: 0, tax_rate: 18 },
  ]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<InvoiceQuote | null>(null);

  const canEdit = activeRole !== 'viewer';
  const canDelete = activeRole === 'owner' || activeRole === 'admin' || activeRole === 'manager';

  const loadDocs = useCallback(async () => {
    if (!supabase || !activeWorkspace) return;
    setLoading(true);
    const wsId = activeWorkspace.id;

    const [docRes, compRes, contRes, prodRes] = await Promise.all([
      supabase
        .from('invoices_quotes')
        .select('*, company:companies(id, name, gst_number), contact:contacts(id, first_name, last_name, email)')
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: false }),
      supabase.from('companies').select('id, name, gst_number').eq('workspace_id', wsId).order('name'),
      supabase.from('contacts').select('id, first_name, last_name, email').eq('workspace_id', wsId).order('first_name'),
      supabase.from('products').select('*').eq('workspace_id', wsId).eq('is_active', true),
    ]);

    setDocs((docRes.data || []) as unknown as InvoiceQuote[]);
    setCompanies((compRes.data || []) as Company[]);
    setContacts((contRes.data || []) as Contact[]);
    setProducts((prodRes.data || []) as Product[]);
    setLoading(false);
  }, [activeWorkspace]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const openCreateModal = () => {
    const seq = String(docs.length + 1).padStart(4, '0');
    setDocType('quote');
    setDocNumber(`QT-${new Date().getFullYear()}-${seq}`);
    setCompanyId('');
    setContactId('');
    setCurrency(activeWorkspace?.default_currency || 'INR');
    setDueDate('');
    setNotes('Payment due within 15 days. Taxes calculated per applicable HSN/SAC rates.');
    setLineItems([{ name: '', hsn_sac_code: '', quantity: 1, unit_price: 0, tax_rate: 18 }]);
    setFormError(null);
    setModalOpen(true);
  };

  const updateLine = (idx: number, patch: Partial<QuoteLineItem>) => {
    setLineItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const handleSelectProduct = (idx: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    updateLine(idx, {
      product_id: prod.id,
      name: prod.name,
      hsn_sac_code: prod.hsn_sac_code || '',
      unit_price: Number(prod.unit_price),
      tax_rate: Number(prod.tax_rate),
    });
  };

  const subtotal = lineItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0
  );
  const taxAmount = lineItems.reduce((sum, item) => {
    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    return sum + lineTotal * ((Number(item.tax_rate) || 0) / 100);
  }, 0);
  const totalAmount = subtotal + taxAmount;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !activeWorkspace || !user) return;
    const validItems = lineItems.filter((l) => l.name.trim());
    if (!docNumber.trim() || validItems.length === 0) {
      setFormError('Document number and at least one line item are required.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const { error } = await supabase.from('invoices_quotes').insert({
      workspace_id: activeWorkspace.id,
      doc_type: docType,
      doc_number: docNumber.trim(),
      status: 'draft',
      currency,
      company_id: companyId || null,
      contact_id: contactId || null,
      line_items: validItems,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      due_date: dueDate || null,
      notes: notes.trim() || null,
      created_by: user.id,
    });

    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setModalOpen(false);
    loadDocs();
  };

  const handleStatusChange = async (docId: string, status: InvoiceQuote['status']) => {
    if (!supabase || !canEdit) return;
    setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, status } : d)));
    await supabase.from('invoices_quotes').update({ status }).eq('id', docId);
  };

  const handleDelete = async (docId: string) => {
    if (!supabase || !canDelete) return;
    await supabase.from('invoices_quotes').delete().eq('id', docId);
    setPreviewDoc(null);
    loadDocs();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Create GST/tax-ready quotes and invoices directly from your product catalog.
        </p>

        {canEdit && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            <span>New Quote / Invoice</span>
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="space-y-2 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              No quotes or invoices created yet
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Issue commercial proposals with automatic GST/tax calculation and print-ready views.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                Create First Quote
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <th className="px-4 py-3">Number</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono-num font-semibold text-slate-900 dark:text-white">
                      {doc.doc_number}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-300">
                      {doc.doc_type}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {doc.company?.name ||
                        (doc.contact
                          ? `${doc.contact.first_name} ${doc.contact.last_name || ''}`
                          : '—')}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        disabled={!canEdit}
                        value={doc.status}
                        onChange={(e) =>
                          handleStatusChange(doc.id, e.target.value as InvoiceQuote['status'])
                        }
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium capitalize text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="accepted">Accepted</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="void">Void</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(doc.total_amount, doc.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
                      >
                        View / Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quote Builder Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Quote or Invoice"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => {
                  const t = e.target.value as 'quote' | 'invoice';
                  setDocType(t);
                  setDocNumber((prev) =>
                    t === 'invoice' ? prev.replace(/^QT-/, 'INV-') : prev.replace(/^INV-/, 'QT-')
                  );
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="quote">Quote / Proposal</option>
                <option value="invoice">Tax Invoice</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Document Number *
              </label>
              <input
                type="text"
                required
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
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
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Select company...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Contact
              </label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Select contact...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name || ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Line Items
              </span>
              <button
                type="button"
                onClick={() =>
                  setLineItems((prev) => [
                    ...prev,
                    { name: '', hsn_sac_code: '', quantity: 1, unit_price: 0, tax_rate: 18 },
                  ])
                }
                className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
              >
                + Add Line Item
              </button>
            </div>

            {lineItems.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-800"
              >
                <div className="col-span-12 sm:col-span-4">
                  {products.length > 0 && (
                    <select
                      value={item.product_id || ''}
                      onChange={(e) => handleSelectProduct(idx, e.target.value)}
                      className="mb-1 w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="">Pick from catalog...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatCurrency(p.unit_price, p.currency)})
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    required
                    value={item.name}
                    onChange={(e) => updateLine(idx, { name: e.target.value })}
                    placeholder="Item description"
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input
                    type="text"
                    value={item.hsn_sac_code || ''}
                    onChange={(e) => updateLine(idx, { hsn_sac_code: e.target.value })}
                    placeholder="HSN/SAC"
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
                    placeholder="Qty"
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono-num text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateLine(idx, { unit_price: Number(e.target.value) })}
                    placeholder="Price"
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono-num text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={item.tax_rate}
                    onChange={(e) => updateLine(idx, { tax_rate: Number(e.target.value) })}
                    placeholder="Tax%"
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono-num text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLineItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Subtotal</span>
                <span className="font-mono-num">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Tax / GST</span>
                <span className="font-mono-num">{formatCurrency(taxAmount, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900 dark:border-slate-800 dark:text-white">
                <span>Total</span>
                <span className="font-mono-num">{formatCurrency(totalAmount, currency)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notes / Payment Terms
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Document'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Print / Preview Modal */}
      <Modal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc ? `${previewDoc.doc_type.toUpperCase()} ${previewDoc.doc_number}` : ''}
        maxWidth="lg"
      >
        {previewDoc && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <div className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {activeWorkspace?.name}
                </div>
                {activeWorkspace?.gst_or_tax_id && (
                  <div className="font-mono text-xs text-slate-500">
                    Tax ID / GSTIN: {activeWorkspace.gst_or_tax_id}
                  </div>
                )}
              </div>
              <div className="text-right text-xs text-slate-600 dark:text-slate-400">
                <div className="font-semibold text-slate-900 dark:text-white">
                  Bill To: {previewDoc.company?.name || previewDoc.contact?.first_name || 'Client'}
                </div>
                {previewDoc.company?.gst_number && (
                  <div className="font-mono">Client GSTIN: {previewDoc.company.gst_number}</div>
                )}
                {previewDoc.due_date && <div>Due Date: {previewDoc.due_date}</div>}
              </div>
            </div>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                  <th className="py-2">Description</th>
                  <th className="py-2">HSN/SAC</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right">Tax</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {(previewDoc.line_items || []).map((li, i) => (
                  <tr key={i}>
                    <td className="py-2.5 font-medium text-slate-900 dark:text-white">{li.name}</td>
                    <td className="py-2.5 font-mono text-slate-500">{li.hsn_sac_code || '—'}</td>
                    <td className="py-2.5 text-right font-mono-num">{li.quantity}</td>
                    <td className="py-2.5 text-right font-mono-num">
                      {formatCurrency(li.unit_price, previewDoc.currency)}
                    </td>
                    <td className="py-2.5 text-right font-mono-num">{li.tax_rate}%</td>
                    <td className="py-2.5 text-right font-mono-num font-semibold">
                      {formatCurrency(li.quantity * li.unit_price, previewDoc.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
              <div className="w-60 space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono-num">
                    {formatCurrency(previewDoc.subtotal, previewDoc.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Tax / GST</span>
                  <span className="font-mono-num">
                    {formatCurrency(previewDoc.tax_amount, previewDoc.currency)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 font-bold text-slate-900 dark:text-white">
                  <span>Grand Total</span>
                  <span className="font-mono-num">
                    {formatCurrency(previewDoc.total_amount, previewDoc.currency)}
                  </span>
                </div>
              </div>
            </div>

            {previewDoc.notes && (
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                {previewDoc.notes}
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => handleDelete(previewDoc.id)}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Delete Document
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
