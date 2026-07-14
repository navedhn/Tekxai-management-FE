import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Ticket as TicketIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import TicketTypeEditor from './TicketTypeEditor';

export default function TicketTypesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editor, setEditor] = useState<any>(null);

  const { data: categories } = useQuery({
    queryKey: ['ticket-categories-for-filter'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.TICKET_CATEGORY.LIST}?include_inactive=true`),
    select: (r: any) => r?.payload || [],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['ticket-types-page'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.TICKET_TYPE.LIST}?include_inactive=true`),
    select: (r: any) => r?.payload || [],
  });

  const toggle_active = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiRequest<any>(API_ENDPOINTS.TICKET_TYPE.ACTIVE(id), { method: 'PATCH', body: JSON.stringify({ is_active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-types-page'] }),
  });

  const types: any[] = (data || []).filter((t: any) => {
    const matches_q = !q || t.label?.toLowerCase().includes(q.toLowerCase()) || t.key?.toLowerCase().includes(q.toLowerCase());
    const matches_cat = !categoryFilter || t.category_id === categoryFilter;
    return matches_q && matches_cat;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Ticket Types</h1>
          <p className="text-sm text-gray-400 mt-0.5">Configure the dynamic form, workflow, SLA and default assignment for each ticket type</p>
        </div>
        <button onClick={() => setEditor({})}
          className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
          <Plus size={16} />Add Ticket Type
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              placeholder="Search ticket types…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {(categories || []).map((c: any) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Ticket Type', 'Category', 'Default Department', 'Workflow Steps', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : types.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No ticket types found</td></tr>
              ) : types.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                        <TicketIcon size={14} className="text-primary-600" />
                      </div>
                      <span className="font-semibold text-gray-900">{t.label}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-gray-600">{t.category?.label || '—'}</td>
                  <td className="py-3 px-2 text-gray-600">{t.department?.name || <span className="text-gray-400 italic">Not set</span>}</td>
                  <td className="py-3 px-2 text-gray-500 text-xs">{Array.isArray(t.workflow) ? t.workflow.length : 0} steps</td>
                  <td className="py-3 px-2">
                    <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide',
                      t.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400')}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditor(t)}
                        className="px-3 h-7 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                        Edit
                      </button>
                      <button
                        onClick={() => toggle_active.mutate({ id: t.id, is_active: !t.is_active })}
                        disabled={toggle_active.isPending}
                        className={cn('px-3 h-7 rounded-lg text-xs font-semibold transition-colors',
                          t.is_active ? 'border border-red-200 text-red-500 hover:bg-red-50' : 'border border-green-200 text-green-600 hover:bg-green-50')}>
                        {t.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editor !== null && <TicketTypeEditor type={editor?.id ? editor : undefined} onClose={() => setEditor(null)} />}
    </div>
  );
}
