import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingDown, TrendingUp, Plus, Eye, X, DollarSign, Users, Search } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

const pkr = (v: number) => `PKR ${(v || 0).toLocaleString('en-PK')}`;
const inputCls = 'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white';

// ── Quick Employee Ledger Access ──────────────────────────────────────────────
function QuickLedgerAccess() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: users } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200`),
    select: (r: any) => r?.payload?.records || [],
  });

  const filtered = ((users || []) as any[]).filter((u: any) =>
    !search || `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <h2 className="text-sm font-black text-gray-700 mb-3">Quick Access — Employee Ledger</h2>
      <p className="text-xs text-gray-400 mb-3">Open any employee's ledger directly to add or view expenses.</p>
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full h-9 pl-8 pr-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
          placeholder="Search employee…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
        {filtered.slice(0, 20).map((u: any) => (
          <button
            key={u.id}
            onClick={() => navigate(`/admin/expenses/${u.employee_id || u.id}`)}
            className="flex items-center gap-1.5 px-3 h-8 bg-gray-50 hover:bg-primary-50 border border-gray-200 hover:border-primary-300 text-gray-700 hover:text-primary-700 rounded-lg text-xs font-semibold transition-colors"
          >
            {u.first_name} {u.last_name}
          </button>
        ))}
        {filtered.length === 0 && <p className="text-xs text-gray-400 py-2">No employees found</p>}
      </div>
    </div>
  );
}

// ── Add Account Modal ─────────────────────────────────────────────────────────
function AddAccountModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');

  const { data: users } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200`),
    select: (r: any) => r?.payload?.records || [],
  });

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.EXPENSES.ACCOUNTS, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, opening_balance: +openingBalance || 0, notes }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expense-accounts'] }); onClose(); },
    onError: (e: any) => setErr(e?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Enable Expense Account</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Employee <span className="text-red-500">*</span></label>
            <select className={inputCls} value={userId} onChange={e => setUserId(e.target.value)}>
              <option value="">Select employee</option>
              {((users || []) as any[]).map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Opening Balance (PKR)</label>
            <input className={inputCls} type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Notes</label>
            <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!userId || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Saving…' : 'Enable Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['expense-summary'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EXPENSES.SUMMARY),
    select: (r: any) => r?.payload,
  });

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['expense-accounts'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EXPENSES.ACCOUNTS),
    select: (r: any) => r?.payload?.records || [],
  });

  const accounts: any[] = accountsData || [];

  const cards = [
    { label: 'Total Received',     value: pkr(summary?.total_received       || 0), icon: TrendingUp,   color: 'bg-green-500' },
    { label: 'Total Spent',        value: pkr(summary?.total_spent          || 0), icon: TrendingDown, color: 'bg-red-500' },
    { label: 'Outstanding Balance',value: pkr(summary?.outstanding_balance  || 0), icon: Wallet,       color: 'bg-blue-500' },
    { label: 'CE Total Spent',     value: pkr(summary?.ce_spent             || 0), icon: DollarSign,   color: 'bg-purple-500' },
    { label: 'Tekxai Total Spent', value: pkr(summary?.tekxai_spent         || 0), icon: DollarSign,   color: 'bg-orange-500' },
    { label: 'Active Accounts',    value: accounts.length,                         icon: Users,        color: 'bg-indigo-500' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Expense Management</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">Track company expenses by employee, CE, and Tekxai</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
          <Plus size={16} />Add Account
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map(c => (
          <div key={c.label} className="flex flex-col gap-2 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', c.color)}>
              <c.icon size={18} className="text-white" />
            </div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide leading-tight">{c.label}</p>
            <p className="text-lg font-black text-gray-900 leading-tight">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Quick access for Super Admin — navigate directly to any employee ledger */}
      <QuickLedgerAccess />

      {/* Active accounts table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-black text-gray-700 mb-4">Employee Expense Accounts</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Employee', 'Opening Bal.', 'Received', 'Spent', 'Balance', 'CE Spent', 'Tekxai Spent', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center">
                    <p className="text-gray-400 text-sm mb-2">No expense accounts with balances yet.</p>
                    <p className="text-gray-300 text-xs">Use "Quick Access" above to open any employee's ledger and start adding entries.</p>
                  </td>
                </tr>
              ) : accounts.map((acc: any) => (
                <tr key={acc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="font-semibold text-gray-900">{acc.user?.first_name} {acc.user?.last_name}</div>
                    <div className="text-xs text-gray-400">{acc.user?.designation || ''}</div>
                  </td>
                  <td className="py-3 px-2 text-gray-600 text-xs font-medium">{pkr(acc.opening_balance)}</td>
                  <td className="py-3 px-2 font-semibold text-green-600 text-xs">{pkr(acc.total_received)}</td>
                  <td className="py-3 px-2 font-semibold text-red-500 text-xs">{pkr(acc.total_spent)}</td>
                  <td className="py-3 px-2">
                    <span className={cn('font-black text-xs', (acc.balance || 0) >= 0 ? 'text-blue-600' : 'text-red-600')}>{pkr(acc.balance)}</span>
                  </td>
                  <td className="py-3 px-2 text-purple-600 font-semibold text-xs">{pkr(acc.ce_spent)}</td>
                  <td className="py-3 px-2 text-orange-600 font-semibold text-xs">{pkr(acc.tekxai_spent)}</td>
                  <td className="py-3 px-2">
                    <button onClick={() => navigate(`/admin/expenses/${acc.user?.employee_id || acc.user?.id}`)}
                      className="flex items-center gap-1.5 px-3 h-7 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition-colors">
                      <Eye size={12} />Ledger
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
