import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useAuthWorkspace } from '../../contexts/AuthWorkspaceContext';
import { Modal } from '../../components/Modal';
import { supabase } from '../../lib/supabase';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../../lib/intl';
import type { Product } from '../../types/crm';

export default function ProductsPage() {
  const { activeWorkspace, activeRole } = useAuthWorkspace();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [hsnSac, setHsnSac] = useState('');
  const [unitPrice, setUnitPrice] = useState('0');
  const [currency, setCurrency] = useState('INR');
  const [taxRate, setTaxRate] = useState('18');
  const [billingFreq, setBillingFreq] = useState<'one_time' | 'monthly' | 'quarterly' | 'annual'>('one_time');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canEdit = activeRole !== 'viewer';
  const canDelete = activeRole === 'owner' || activeRole === 'admin' || activeRole === 'manager';

  const loadProducts = useCallback(async () => {
    if (!supabase || !activeWorkspace) return;
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('workspace_id', activeWorkspace.id)
      .order('created_at', { ascending: false });
    setProducts((data || []) as Product[]);
    setLoading(false);
  }, [activeWorkspace]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setSku('');
    setHsnSac('');
    setUnitPrice('');
    setCurrency(activeWorkspace?.default_currency || 'INR');
    setTaxRate('18');
    setBillingFreq('one_time');
    setDescription('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name);
    setSku(p.sku || '');
    setHsnSac(p.hsn_sac_code || '');
    setUnitPrice(String(p.unit_price));
    setCurrency(p.currency);
    setTaxRate(String(p.tax_rate));
    setBillingFreq(p.billing_frequency);
    setDescription(p.description || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !activeWorkspace) return;
    if (!name.trim()) {
      setFormError('Product or service name is required.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      workspace_id: activeWorkspace.id,
      name: name.trim(),
      sku: sku.trim() || null,
      hsn_sac_code: hsnSac.trim() || null,
      unit_price: parseFloat(unitPrice) || 0,
      currency,
      tax_rate: parseFloat(taxRate) || 0,
      billing_frequency: billingFreq,
      description: description.trim() || null,
      is_active: true,
    };

    const { error } = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert(payload);

    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setModalOpen(false);
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    if (!supabase || !canDelete) return;
    await supabase.from('products').delete().eq('id', id);
    setModalOpen(false);
    loadProducts();
  };

  const filtered = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.hsn_sac_code || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU, HSN/SAC, name..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product / Service</span>
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
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Your product catalog is empty
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Add products or services with HSN/SAC codes and GST/VAT rates to generate quotes
              faster.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                Add First Product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <th className="px-4 py-3">Product / Service</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">HSN / SAC</th>
                  <th className="px-4 py-3">Billing</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Tax %</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{p.name}</div>
                      {p.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono-num text-xs text-slate-600 dark:text-slate-300">
                      {p.sku || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono-num text-xs text-slate-600 dark:text-slate-300">
                      {p.hsn_sac_code || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-slate-600 dark:text-slate-300">
                      {p.billing_frequency.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(p.unit_price, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num text-xs text-slate-600 dark:text-slate-300">
                      {p.tax_rate}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Product' : 'Add Product / Service'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Annual Implementation Package"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                SKU Code
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="YB-IMP-01"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                HSN / SAC Code
              </label>
              <input
                type="text"
                value={hsnSac}
                onChange={(e) => setHsnSac(e.target.value)}
                placeholder="998314"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Unit Price
              </label>
              <input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono-num text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tax / GST %
              </label>
              <input
                type="number"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono-num text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Billing Frequency
            </label>
            <select
              value={billingFreq}
              onChange={(e) =>
                setBillingFreq(e.target.value as 'one_time' | 'monthly' | 'quarterly' | 'annual')
              }
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="one_time">One-Time</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {editing && canDelete ? (
              <button
                type="button"
                onClick={() => handleDelete(editing.id)}
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
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
