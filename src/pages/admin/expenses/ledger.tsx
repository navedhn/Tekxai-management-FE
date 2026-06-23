import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';

const pkr = (v: number) => `PKR ${(v || 0).toLocaleString('en-PK')}`;
const inputCls = 'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white';

// ── Add/Edit Transaction Modal ────────────────────────────────────────────────
function TransactionModal({
  userId, editTxn, onClose,
}: { userId: string; editTxn?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToastContext();
  const isEdit = !!editTxn;
  const [type, setType] = useState<'income' | 'expense'>(editTxn?.transaction_type || 'expense');
  const [form, setForm] = useState({
    date:         editTxn?.date ? new Date(editTxn.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    title:        editTxn?.title        || '',
    total_amount: editTxn?.total_amount?.toString() || '',
    ce_amount:    editTxn?.ce_amount?.toString()    || '',
    tekxai_amount:editTxn?.tekxai_amount?.toString()|| '',
    category_id:  editTxn?.category_id  || '',
    paid_to:      editTxn?.paid_to      || '',
    notes:        editTxn?.notes        || '',
  });
  const [allocation, setAllocation] = useState<'ce' | 'tekxai' | 'split'>(
    editTxn ? (editTxn.ce_amount === editTxn.total_amount ? 'ce' : editTxn.tekxai_amount === editTxn.total_amount ? 'tekxai' : 'split') : 'split'
  );
  const [err, setErr] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EXPENSES.CATEGORIES),
    select: (r: any) => r?.payload?.records || [],
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleAllocChange = (alloc: 'ce' | 'tekxai' | 'split') => {
    setAllocation(alloc);
    const total = +form.total_amount || 0;
    if (alloc === 'ce')     setForm(p => ({ ...p, ce_amount: String(total), tekxai_amount: '0' }));
    if (alloc === 'tekxai') setForm(p => ({ ...p, ce_amount: '0', tekxai_amount: String(total) }));
    if (alloc === 'split')  setForm(p => ({ ...p, ce_amount: String(total / 2), tekxai_amount: String(total / 2) }));
  };

  const handleTotalChange = (v: string) => {
    const total = +v || 0;
    if (allocation === 'ce')     setForm(p => ({ ...p, total_amount: v, ce_amount: v, tekxai_amount: '0' }));
    if (allocation === 'tekxai') setForm(p => ({ ...p, total_amount: v, ce_amount: '0', tekxai_amount: v }));
    if (allocation === 'split')  setForm(p => ({ ...p, total_amount: v, ce_amount: String(total / 2), tekxai_amount: String(total / 2) }));
  };

  const body = {
    transaction_type: type,
    date:          form.date,
    title:         form.title,
    total_amount:  +form.total_amount || 0,
    ce_amount:     type === 'income' ? (+form.total_amount || 0) / 2 : +form.ce_amount || 0,
    tekxai_amount: type === 'income' ? (+form.total_amount || 0) / 2 : +form.tekxai_amount || 0,
    category_id:   form.category_id || null,
    paid_to:       form.paid_to || null,
    notes:         form.notes || null,
  };

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? apiRequest<any>(API_ENDPOINTS.EXPENSES.TRANSACTION(editTxn.id), { method: 'PUT', body: JSON.stringify(body) })
      : apiRequest<any>(API_ENDPOINTS.EXPENSES.TRANSACTIONS(userId), { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-ledger', userId] });
      qc.invalidateQueries({ queryKey: ['expense-accounts'] });
      toast.success(isEdit ? 'Transaction updated' : 'Transaction added');
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Failed'),
  });

  const validate = () => {
    if (!form.title) { setErr('Title required'); return false; }
    if (!form.total_amount) { setErr('Amount required'); return false; }
    if (type === 'expense') {
      const ce = +form.ce_amount || 0, tx = +form.tekxai_amount || 0, total = +form.total_amount || 0;
      if (Math.abs(ce + tx - total) > 1) { setErr(`CE (${ce.toLocaleString()}) + Tekxai (${tx.toLocaleString()}) must equal Total (${total.toLocaleString()})`); return false; }
    }
    setErr('');
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">{isEdit ? 'Edit' : 'Add'} Transaction</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        {/* Type toggle */}
        <div className="flex gap-2 mb-4">
          {(['income', 'expense'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={cn('flex-1 h-9 rounded-xl text-sm font-semibold transition-colors border',
                type === t ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
              {t === 'income' ? '+ Income / Received' : '− Expense'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Date *</label>
              <input className={inputCls} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Amount (PKR) *</label>
              <input className={inputCls} type="number" value={form.total_amount} onChange={e => handleTotalChange(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Title / Details *</label>
            <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Rent JT, Office Supplies…" />
          </div>

          {type === 'expense' && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Category</label>
                <select className={inputCls} value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                  <option value="">Select category</option>
                  {(categories || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Allocation</label>
                <div className="flex gap-2">
                  {(['ce', 'tekxai', 'split'] as const).map(a => (
                    <button key={a} onClick={() => handleAllocChange(a)}
                      className={cn('flex-1 h-8 rounded-lg text-xs font-semibold border transition-colors',
                        allocation === a ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                      {a === 'ce' ? 'CE Only' : a === 'tekxai' ? 'Tekxai Only' : 'Split'}
                    </button>
                  ))}
                </div>
              </div>
              {allocation === 'split' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">CE Amount</label>
                    <input className={inputCls} type="number" value={form.ce_amount}
                      onChange={e => { setForm(p => ({ ...p, ce_amount: e.target.value, tekxai_amount: String(Math.max(0, (+p.total_amount || 0) - (+e.target.value || 0))) })); }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Tekxai Amount</label>
                    <input className={inputCls} type="number" value={form.tekxai_amount}
                      onChange={e => { setForm(p => ({ ...p, tekxai_amount: e.target.value, ce_amount: String(Math.max(0, (+p.total_amount || 0) - (+e.target.value || 0))) })); }} />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Paid To / Vendor</label>
                <input className={inputCls} value={form.paid_to} onChange={e => set('paid_to', e.target.value)} placeholder="Landlord, Utility Company…" />
              </div>
            </>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Notes</label>
            <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        {err && <p className="text-red-500 text-xs mt-3 font-medium">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => { if (validate()) mutation.mutate(); }}
            disabled={mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Saving…' : isEdit ? 'Update' : 'Add Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ledger Page ───────────────────────────────────────────────────────────────
export default function ExpenseLedgerPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToastContext();
  const [showModal, setShowModal] = useState(false);
  const [editTxn, setEditTxn] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = new URLSearchParams();
  if (typeFilter) params.set('type', typeFilter);
  if (from) params.set('from', from);
  if (to)   params.set('to', to);

  const { data, isLoading } = useQuery({
    queryKey: ['expense-ledger', userId, typeFilter, from, to],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.EXPENSES.ACCOUNT(userId!)}?${params}`),
    select: (r: any) => r?.payload,
    enabled: !!userId,
  });

  const account      = data?.account;
  const transactions: any[] = data?.transactions || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest<any>(API_ENDPOINTS.EXPENSES.TRANSACTION(id), { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expense-ledger', userId] }); qc.invalidateQueries({ queryKey: ['expense-accounts'] }); toast.success('Deleted'); },
    onError: () => toast.error('Delete failed'),
  });

  const name = account ? `${account.user?.first_name} ${account.user?.last_name}` : 'Loading…';

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/expenses')} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Expenses — {name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Ledger view with CE and Tekxai allocation</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditTxn(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
            <Plus size={16} />Add Transaction
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {account && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Balance',         value: pkr(account.balance),         color: 'text-blue-600' },
            { label: 'Total Received',  value: pkr(account.total_received),  color: 'text-green-600' },
            { label: 'Total Spent',     value: pkr(account.total_spent),     color: 'text-red-500' },
            { label: 'CE Spent',        value: pkr(account.ce_spent),        color: 'text-purple-600' },
            { label: 'Tekxai Spent',    value: pkr(account.tekxai_spent),    color: 'text-orange-600' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{c.label}</p>
              <p className={cn('text-lg font-black leading-tight', c.color)}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none">
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none" placeholder="From" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none" placeholder="To" />
        {(typeFilter || from || to) && (
          <button onClick={() => { setTypeFilter(''); setFrom(''); setTo(''); }}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">Clear</button>
        )}
      </div>

      {/* Ledger table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Details', 'Category', 'Type', 'CE Amount', 'Tekxai Amt', 'Total', 'Balance', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="py-4 px-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : transactions.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-gray-400 text-sm">No transactions yet</td></tr>
              ) : transactions.map((t: any) => {
                const isIncome = t.transaction_type === 'income';
                return (
                  <tr key={t.id} className={cn('hover:bg-gray-50 transition-colors', isIncome ? 'bg-green-50/40' : '')}>
                    <td className="py-3 px-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-gray-900">{t.title}</div>
                      {t.paid_to && <div className="text-xs text-gray-400">{t.paid_to}</div>}
                    </td>
                    <td className="py-3 px-3 text-gray-400 text-xs">{t.category?.name || '—'}</td>
                    <td className="py-3 px-3">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', isIncome ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                        {isIncome ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-purple-600 font-medium text-xs">{t.ce_amount > 0 ? pkr(t.ce_amount) : '—'}</td>
                    <td className="py-3 px-3 text-orange-600 font-medium text-xs">{t.tekxai_amount > 0 ? pkr(t.tekxai_amount) : '—'}</td>
                    <td className="py-3 px-3 font-semibold text-gray-900 text-xs">{isIncome ? <span className="text-green-600">+{pkr(t.total_amount)}</span> : <span className="text-red-500">−{pkr(t.total_amount)}</span>}</td>
                    <td className="py-3 px-3">
                      <span className={cn('font-black text-xs', (t.running_balance || 0) >= 0 ? 'text-blue-600' : 'text-red-600')}>{pkr(t.running_balance || 0)}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setEditTxn(t); setShowModal(true); }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => { if (window.confirm('Delete this transaction?')) deleteMutation.mutate(t.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <TransactionModal
          userId={userId!}
          editTxn={editTxn}
          onClose={() => { setShowModal(false); setEditTxn(null); }}
        />
      )}
    </div>
  );
}
