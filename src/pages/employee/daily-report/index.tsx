import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, FileText } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

const inputCls = 'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400';

function SubmitModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    tasks_completed: '',
    blockers: '',
    plan_for_tomorrow: '',
    hours_worked: '',
  });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.PERFORMANCE.DAILY_REPORTS, {
      method: 'POST',
      body: JSON.stringify({ ...form, hours_worked: form.hours_worked ? +form.hours_worked : undefined }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-daily-reports'] }); onClose(); },
    onError: (e: any) => setErr(e?.message || 'Failed to submit'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Submit Daily Report</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Date <span className="text-red-500">*</span></label>
              <input type="date" className={inputCls}
                value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Hours Worked</label>
              <input type="number" min="0" max="24" step="0.5" className={inputCls}
                value={form.hours_worked} onChange={e => setForm(p => ({ ...p, hours_worked: e.target.value }))} placeholder="8" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Tasks Completed <span className="text-red-500">*</span></label>
            <textarea className="w-full h-24 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={form.tasks_completed} onChange={e => setForm(p => ({ ...p, tasks_completed: e.target.value }))}
              placeholder="List tasks you completed today…" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Blockers / Issues</label>
            <textarea className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={form.blockers} onChange={e => setForm(p => ({ ...p, blockers: e.target.value }))}
              placeholder="Any blockers or issues faced…" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Plan for Tomorrow</label>
            <textarea className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={form.plan_for_tomorrow} onChange={e => setForm(p => ({ ...p, plan_for_tomorrow: e.target.value }))}
              placeholder="What you plan to work on tomorrow…" />
          </div>
        </div>

        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!form.date || !form.tasks_completed || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DailyReportPage() {
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-daily-reports'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PERFORMANCE.DAILY_REPORTS),
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });

  const reports: any[] = data || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Daily Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Submit and view your daily work reports</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
          <Plus size={16} />Submit Report
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-semibold">No reports submitted yet</p>
            <p className="text-xs text-gray-300 mt-1">Submit your first daily report</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Date', 'Tasks Completed', 'Blockers', 'Tomorrow\'s Plan', 'Hours'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-semibold text-gray-900 whitespace-nowrap">
                      {r.date ? new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td className="py-3 px-2 text-gray-600 max-w-[220px]">
                      <p className="line-clamp-2 text-xs leading-relaxed">{r.tasks_completed || r.tasks || '—'}</p>
                    </td>
                    <td className="py-3 px-2 text-gray-500 max-w-[160px]">
                      <p className="line-clamp-2 text-xs leading-relaxed">{r.blockers || '—'}</p>
                    </td>
                    <td className="py-3 px-2 text-gray-500 max-w-[160px]">
                      <p className="line-clamp-2 text-xs leading-relaxed">{r.plan_for_tomorrow || '—'}</p>
                    </td>
                    <td className="py-3 px-2 font-semibold text-gray-700">
                      {r.hours_worked ?? r.hours ?? '—'}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <SubmitModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
