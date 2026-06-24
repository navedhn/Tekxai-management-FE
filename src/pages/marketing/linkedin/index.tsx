import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

const STATUS_STYLE: Record<string, string> = {
  NEW:        'bg-blue-100 text-blue-700',
  CONTACTED:  'bg-purple-100 text-purple-700',
  REPLIED:    'bg-amber-100 text-amber-700',
  MEETING:    'bg-indigo-100 text-indigo-700',
  WON:        'bg-green-100 text-green-700',
  LOST:       'bg-red-100 text-red-700',
};

const EMPTY_FORM = { full_name: '', job_title: '', linkedin_url: '', client_name: '', invite_note: '', pipeline_stage: 'NEW' };

function AddLinkedInModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest<any>(API_ENDPOINTS.MARKETING.LINKEDIN, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['linkedin-leads'] }); onClose(); },
    onError: (e: any) => setErr(e?.message || 'Failed to save lead'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-black text-gray-900">Add LinkedIn Lead</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 flex flex-col gap-3">
          {err && <p className="text-red-500 text-xs font-semibold">{err}</p>}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Full Name *</label>
            <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
              placeholder="John Smith" value={form.full_name} onChange={set('full_name')} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Job Title</label>
            <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
              placeholder="CTO at Acme Corp" value={form.job_title} onChange={set('job_title')} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">LinkedIn URL</label>
            <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
              placeholder="https://linkedin.com/in/..." value={form.linkedin_url} onChange={set('linkedin_url')} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Company</label>
            <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
              placeholder="Company name" value={form.client_name} onChange={set('client_name')} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Stage</label>
            <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
              value={form.pipeline_stage} onChange={set('pipeline_stage')}>
              {['NEW', 'CONTACTED', 'REPLIED', 'MEETING', 'WON', 'LOST'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Invite Note</label>
            <textarea className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none"
              rows={2} placeholder="Connection invite message…" value={form.invite_note} onChange={set('invite_note')} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
          <button
            disabled={!form.full_name.trim() || mutation.isPending}
            onClick={() => mutation.mutate(form)}
            className="px-4 py-2 rounded-xl text-sm font-black bg-[#005CDA] text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Saving…' : 'Add Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LinkedInPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['linkedin-leads', statusFilter],
    queryFn: () => {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      return apiRequest<any>(`${API_ENDPOINTS.MARKETING.LINKEDIN}${params}`);
    },
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });

  const leads: any[] = data || [];

  return (
    <div className="flex flex-col gap-6">
      {showAdd && <AddLinkedInModal onClose={() => setShowAdd(false)} />}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">LinkedIn Leads</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track outreach and connections on LinkedIn</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#005CDA] text-white text-sm font-black hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Add Lead
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="mb-4">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm text-gray-600">
            <option value="">All Status</option>
            {['NEW', 'CONTACTED', 'REPLIED', 'MEETING', 'WON', 'LOST'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Name', 'Company / Title', 'Stage', 'Date', 'Invite Note'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : leads.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">No LinkedIn leads yet — add one above</td></tr>
              ) : leads.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2 font-semibold text-gray-900">
                    {lead.full_name || '—'}
                    {lead.linkedin_url && (
                      <a href={lead.linkedin_url} target="_blank" rel="noreferrer" className="ml-1 text-xs text-blue-500 hover:underline">↗</a>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <p className="text-gray-700">{lead.client_name || '—'}</p>
                    {lead.job_title && <p className="text-xs text-gray-400">{lead.job_title}</p>}
                  </td>
                  <td className="py-3 px-2">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLE[lead.pipeline_stage] || STATUS_STYLE[lead.status] || 'bg-gray-100 text-gray-500')}>
                      {lead.pipeline_stage || lead.status || 'NEW'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500 text-xs whitespace-nowrap">
                    {lead.date || lead.created_at ? new Date(lead.date || lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-2 text-gray-500 max-w-[200px] truncate">{lead.invite_note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
