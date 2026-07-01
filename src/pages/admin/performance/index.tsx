import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, TrendingUp, DollarSign, Plus, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

const STATUS_STYLE: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-700',
  DRAFT:     'bg-gray-100 text-gray-500',
  PENDING:   'bg-amber-100 text-amber-700',
};

function DailyReportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], todays_progress: '', blockers: '', tomorrow_plan: '', hours_worked: '' });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.PERFORMANCE.DAILY_REPORTS, {
      method: 'POST',
      body: JSON.stringify({ ...form, hours_worked: form.hours_worked ? +form.hours_worked : undefined }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['perf-reports'] }); onClose(); },
    onError: (e: any) => setErr(e?.message || 'Failed to submit report'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Add Daily Report</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Hours Worked</label>
              <input type="number" min="0" max="24" value={form.hours_worked} onChange={e => setForm(p => ({ ...p, hours_worked: e.target.value }))}
                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" placeholder="8" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Today's Progress <span className="text-red-500">*</span></label>
            <textarea value={form.todays_progress} onChange={e => setForm(p => ({ ...p, todays_progress: e.target.value }))}
              className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              placeholder="What did you accomplish today?" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Blockers</label>
            <textarea value={form.blockers} onChange={e => setForm(p => ({ ...p, blockers: e.target.value }))}
              className="w-full h-16 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              placeholder="Any blockers or issues?" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Tomorrow's Plan</label>
            <textarea value={form.tomorrow_plan} onChange={e => setForm(p => ({ ...p, tomorrow_plan: e.target.value }))}
              className="w-full h-16 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              placeholder="What's planned for tomorrow?" />
          </div>
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!form.todays_progress || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 cursor-pointer">
            {mutation.isPending ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ employee_id: '', score: '', period: '', notes: '' });
  const [err, setErr] = useState('');

  const { data: users } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200&status=ACTIVE`),
    select: (r: any) => r?.payload?.records || [],
  });

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.PERFORMANCE.SCORES, {
      method: 'POST',
      body: JSON.stringify({ ...form, score: +form.score }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['perf-scores'] }); onClose(); },
    onError: (e: any) => setErr(e?.message || 'Failed to submit'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Submit Score</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Employee <span className="text-red-500">*</span></label>
            <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 text-gray-700"
              value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}>
              <option value="">Select employee</option>
              {(users || []).map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Score (1–100) <span className="text-red-500">*</span></label>
              <input type="number" min="1" max="100"
                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
                value={form.score} onChange={e => setForm(p => ({ ...p, score: e.target.value }))} placeholder="85" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Period</label>
              <input type="month"
                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
                value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Notes</label>
            <textarea className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Performance notes…" />
          </div>
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!form.employee_id || !form.score || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Submitting…' : 'Submit Score'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const [tab, setTab] = useState<'reports' | 'scores' | 'bonus'>('reports');
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['perf-reports'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PERFORMANCE.DAILY_REPORTS),
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });

  const { data: scores, isLoading: scoresLoading } = useQuery({
    queryKey: ['perf-scores'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PERFORMANCE.SCORES),
    select: (r: any) => r?.payload?.records || r?.payload || [],
    enabled: tab === 'scores',
  });

  const { data: bonuses, isLoading: bonusLoading } = useQuery({
    queryKey: ['perf-bonus'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PERFORMANCE.BONUS),
    select: (r: any) => r?.payload?.records || r?.payload || [],
    enabled: tab === 'bonus',
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Performance</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track daily reports, scores, and bonuses</p>
        </div>
        {tab === 'reports' && (
          <button onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors cursor-pointer">
            <Plus size={16} />Add Report
          </button>
        )}
        {tab === 'scores' && (
          <button onClick={() => setShowScoreModal(true)}
            className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors cursor-pointer">
            <Plus size={16} />Submit Score
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-gray-100">
        {([['reports', 'Daily Reports', Star], ['scores', 'Scores', TrendingUp], ['bonus', 'Bonus', DollarSign]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors',
              tab === key ? 'text-primary-700 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700')}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        {tab === 'reports' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Employee', 'Date', 'Tasks Completed', 'Blockers', 'Hours', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reportsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : !reports?.length ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No daily reports</td></tr>
                ) : (reports as any[]).map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-semibold text-gray-900">
                      {r.user?.first_name} {r.user?.last_name}
                    </td>
                    <td className="py-3 px-2 text-gray-500 whitespace-nowrap text-xs">
                      {r.date ? new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-3 px-2 text-gray-600 max-w-[200px] truncate">{r.tasks_completed || r.tasks || '—'}</td>
                    <td className="py-3 px-2 text-gray-600 max-w-[160px] truncate">{r.blockers || '—'}</td>
                    <td className="py-3 px-2 text-gray-700 font-semibold">{r.hours_worked ?? r.hours ?? '—'}</td>
                    <td className="py-3 px-2">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-500')}>
                        {r.status || 'SUBMITTED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'scores' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Employee', 'Period', 'Score', 'Rating', 'Notes'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {scoresLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : !scores?.length ? (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">No scores recorded</td></tr>
                ) : (scores as any[]).map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-semibold text-gray-900">
                      {s.user?.first_name} {s.user?.last_name}
                    </td>
                    <td className="py-3 px-2 text-gray-500 text-xs">{s.period || '—'}</td>
                    <td className="py-3 px-2">
                      <span className="text-lg font-black text-gray-900">{s.score ?? '—'}</span>
                      <span className="text-xs text-gray-400 ml-1">/100</span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} size={12} className={s.score >= n * 20 ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-gray-500 max-w-[200px] truncate">{s.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'bonus' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Employee', 'Period', 'Amount', 'Type', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bonusLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : !bonuses?.length ? (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">No bonus records</td></tr>
                ) : (bonuses as any[]).map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-semibold text-gray-900">{b.user?.first_name} {b.user?.last_name}</td>
                    <td className="py-3 px-2 text-gray-500 text-xs">{b.period || '—'}</td>
                    <td className="py-3 px-2 font-semibold text-gray-900">
                      {b.amount ? `PKR ${Number(b.amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-2 text-gray-600">{b.bonus_type || b.type || '—'}</td>
                    <td className="py-3 px-2">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLE[b.status] || 'bg-gray-100 text-gray-500')}>
                        {b.status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showReportModal && <DailyReportModal onClose={() => setShowReportModal(false)} />}
      {showScoreModal && <ScoreModal onClose={() => setShowScoreModal(false)} />}
    </div>
  );
}
