import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, X, Layers } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

function Modal({ category, onClose }: { category?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    key: category?.key || '',
    label: category?.label || '',
    sort_order: category?.sort_order ?? 0,
  });
  const [err, setErr] = useState('');
  const is_edit = !!category?.id;

  const mutation = useMutation({
    mutationFn: () => {
      const payload = is_edit ? { label: form.label, sort_order: form.sort_order } : form;
      return is_edit
        ? apiRequest<any>(API_ENDPOINTS.TICKET_CATEGORY.UPDATE(category.id), { method: 'PUT', body: JSON.stringify(payload) })
        : apiRequest<any>(API_ENDPOINTS.TICKET_CATEGORY.CREATE, { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ticket-categories-page'] }); onClose(); },
    onError: (e: any) => setErr(e?.message || 'Failed to save'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">{is_edit ? 'Edit Category' : 'Add Ticket Category'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Category Name <span className="text-red-500">*</span></label>
            <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Facilities" />
          </div>
          {!is_edit && (
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Internal Key <span className="text-red-500">*</span></label>
              <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 uppercase"
                value={form.key} onChange={e => setForm(p => ({ ...p, key: e.target.value.toUpperCase().replace(/\s+/g, '_') }))} placeholder="e.g. FACILITIES" />
              <p className="text-[11px] text-gray-400 mt-1">Used internally, cannot be changed after creation.</p>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Sort Order</label>
            <input type="number" className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: +e.target.value }))} />
          </div>
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!form.label || (!is_edit && !form.key) || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TicketCategoriesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ticket-categories-page'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.TICKET_CATEGORY.LIST}?include_inactive=true`),
    select: (r: any) => r?.payload || [],
  });

  const toggle_active = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiRequest<any>(API_ENDPOINTS.TICKET_CATEGORY.ACTIVE(id), { method: 'PATCH', body: JSON.stringify({ is_active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-categories-page'] }),
  });

  const categories: any[] = (data || []).filter((c: any) =>
    !q || c.label?.toLowerCase().includes(q.toLowerCase()) || c.key?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Ticket Categories</h1>
          <p className="text-sm text-gray-400 mt-0.5">Business classification for the Service Desk — grouped by Ticket Types</p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
          <Plus size={16} />Add Category
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="relative mb-4 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
            placeholder="Search categories…" value={q} onChange={e => setQ(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Category', 'Key', 'Ticket Types', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : categories.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">No ticket categories found</td></tr>
              ) : categories.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Layers size={14} className="text-indigo-600" />
                      </div>
                      <span className="font-semibold text-gray-900">{c.label}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-gray-500 font-mono text-xs">{c.key}</td>
                  <td className="py-3 px-2 text-gray-600">{c._count?.ticket_types ?? 0}</td>
                  <td className="py-3 px-2">
                    <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide',
                      c.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400')}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setModal(c)}
                        className="px-3 h-7 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                        Edit
                      </button>
                      <button
                        onClick={() => toggle_active.mutate({ id: c.id, is_active: !c.is_active })}
                        disabled={toggle_active.isPending}
                        className={cn('px-3 h-7 rounded-lg text-xs font-semibold transition-colors',
                          c.is_active ? 'border border-red-200 text-red-500 hover:bg-red-50' : 'border border-green-200 text-green-600 hover:bg-green-50')}>
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && <Modal category={modal?.id ? modal : undefined} onClose={() => setModal(null)} />}
    </div>
  );
}
