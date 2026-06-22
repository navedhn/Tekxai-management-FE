import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Clock, Plus, Check, X, AlertTriangle, DollarSign, Users, Calendar } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import {
  useGetOvertimeList, useGetOvertimeStats,
  useSubmitOvertime, useApproveOvertime, useRejectOvertime, useCancelOvertime,
} from '@/services/employeeService';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const STATUS_STYLE: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-700',
  APPROVED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const THIS_YEAR  = new Date().getFullYear();
const THIS_MONTH = new Date().getMonth() + 1;

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: any }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { icon: Clock,       label: 'Total Requests',    value: stats.total,            color: 'bg-blue-500' },
        { icon: Check,       label: 'Approved',          value: stats.approved,         color: 'bg-green-500' },
        { icon: AlertTriangle, label: 'Pending',         value: stats.pending,          color: 'bg-amber-500' },
        { icon: DollarSign, label: 'Total Payable (hrs)', value: stats.total_approved_hours ? `${stats.total_approved_hours}h` : '—', color: 'bg-purple-500' },
      ].map(s => (
        <div key={s.label} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.color)}>
            <s.icon size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold">{s.label}</p>
            <p className="text-xl font-black text-gray-900">{s.value ?? '—'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Submit Overtime Modal ─────────────────────────────────────────────────────
function SubmitModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const submit = useSubmitOvertime();
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '', end_time: '', reason: '', notes: '',
  });

  const calc_minutes = () => {
    if (!form.start_time || !form.end_time) return 0;
    const [sh, sm] = form.start_time.split(':').map(Number);
    const [eh, em] = form.end_time.split(':').map(Number);
    return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  };

  const mins = calc_minutes();
  const hrs  = (mins / 60).toFixed(2);

  const handleSubmit = () => {
    if (!form.date || !form.reason) return;
    submit.mutate({
      date: new Date(form.date).toISOString(),
      start_time: form.start_time,
      end_time:   form.end_time,
      duration_minutes: mins,
      reason: form.reason,
      notes:  form.notes,
    }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Submit Overtime</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Start Time</label>
              <input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">End Time</label>
              <input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
            </div>
          </div>
          {mins > 0 && (
            <div className="bg-primary-50 rounded-xl p-3 text-sm text-primary-700 font-semibold">
              Duration: {hrs} hours ({mins} minutes)
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Reason <span className="text-red-500">*</span></label>
            <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              placeholder="Why is overtime needed?" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Additional Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full h-16 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              placeholder="Optional notes…" />
          </div>
        </div>

        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2.5 mt-4">
          Note: Overtime must be submitted on the same day. Late submissions will be flagged for review.
        </p>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={submit.isPending || !form.date || !form.reason}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 transition-colors">
            {submit.isPending ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>

        {submit.isError && (
          <p className="text-red-500 text-xs mt-2 text-center">{(submit.error as Error)?.message}</p>
        )}
      </div>
    </div>
  );
}

// ── Approve / Reject Modal ────────────────────────────────────────────────────
function ApproveModal({ record, onClose }: { record: any; onClose: () => void }) {
  const [comment, setComment] = useState('');
  const approve = useApproveOvertime();
  const reject  = useRejectOvertime();

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900">Review Overtime</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm mb-4">
          <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-semibold">{record.date ? new Date(record.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-semibold">{record.duration_minutes ? `${(record.duration_minutes/60).toFixed(1)}h (${record.duration_minutes} min)` : '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Eligible</span><span className={cn('font-semibold', record.eligible_for_overtime ? 'text-green-600' : 'text-red-500')}>{record.eligible_for_overtime ? 'Yes' : `No — ${record.eligibility_reason || 'threshold'}`}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Rate</span><span className="font-semibold">{record.overtime_multiplier ?? 1.5}x</span></div>
          {record.approved_amount && <div className="flex justify-between"><span className="text-gray-500">Approx. Amount</span><span className="font-semibold">PKR {Math.round(record.approved_amount).toLocaleString()}</span></div>}
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Comment</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)}
            className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
            placeholder="Optional comment…" />
        </div>

        <div className="flex gap-3">
          <button onClick={() => reject.mutate({ id: record.id, comment }, { onSuccess: onClose })}
            disabled={reject.isPending}
            className="flex-1 h-10 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-40 transition-colors">
            {reject.isPending ? '…' : 'Reject'}
          </button>
          <button onClick={() => approve.mutate({ id: record.id, comment }, { onSuccess: onClose })}
            disabled={approve.isPending}
            className="flex-1 h-10 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors">
            {approve.isPending ? 'Approving…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Overtime Page ────────────────────────────────────────────────────────
export default function OvertimePage() {
  const { role } = useAuth();
  const isAdmin = role ? ['ADMIN','SUPER_ADMIN','HR'].includes(role) : false;

  const [status, setStatus]  = useState('');
  const [year, setYear]      = useState(THIS_YEAR);
  const [month, setMonth]    = useState(THIS_MONTH);
  const [showSubmit, setShowSubmit]   = useState(false);
  const [approveTarget, setApprove]  = useState<any>(null);

  const statsFilters = { year, month };
  const listFilters  = { status: status || undefined, year, month };

  const { data: stats }         = useGetOvertimeStats(statsFilters);
  const { data, isLoading }     = useGetOvertimeList(listFilters);
  const records: any[] = data?.records || [];
  const cancel = useCancelOvertime();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Overtime</h1>
          <p className="text-sm text-gray-400 mt-0.5">Submit and manage overtime requests</p>
        </div>
        <button onClick={() => setShowSubmit(true)}
          className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
          <Plus size={16} />Submit Overtime
        </button>
      </div>

      <StatsBar stats={stats} />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 mb-4">
          <select value={year} onChange={e => setYear(+e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm">
            {[THIS_YEAR - 1, THIS_YEAR].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(+e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm">
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm">
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {(isAdmin ? ['Employee', 'Date', 'Duration', 'Reason', 'Eligible', 'Same Day?', 'Status', 'Amount', 'Actions']
                          : ['Date', 'Duration', 'Reason', 'Eligible', 'Same Day?', 'Status', 'Amount', 'Actions'])
                  .map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-gray-400 text-sm">No overtime records</td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  {isAdmin && (
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-semibold text-gray-800 text-xs">{r.user?.first_name} {r.user?.last_name}</p>
                        <p className="text-gray-400 text-xs">{r.user?.designation || ''}</p>
                      </div>
                    </td>
                  )}
                  <td className="py-3 px-2 text-gray-700 whitespace-nowrap text-xs">
                    {r.date ? new Date(r.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                  </td>
                  <td className="py-3 px-2 text-gray-700 font-semibold whitespace-nowrap">
                    {r.duration_minutes ? `${(r.duration_minutes / 60).toFixed(1)}h` : '—'}
                    <span className="text-xs text-gray-400 ml-1">({r.start_time}–{r.end_time})</span>
                  </td>
                  <td className="py-3 px-2 text-gray-600 max-w-[200px] truncate" title={r.reason}>{r.reason}</td>
                  <td className="py-3 px-2">
                    <span className={cn('text-xs font-semibold', r.eligible_for_overtime ? 'text-green-600' : 'text-red-500')}>
                      {r.eligible_for_overtime ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    {r.is_late_submission
                      ? <span className="text-xs text-amber-600 font-semibold">Late</span>
                      : <span className="text-xs text-green-600 font-semibold">Yes</span>}
                  </td>
                  <td className="py-3 px-2">
                    <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-500')}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-700 font-semibold whitespace-nowrap text-xs">
                    {r.approved_amount ? `PKR ${Math.round(r.approved_amount).toLocaleString()}` : '—'}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      {isAdmin && r.status === 'PENDING' && (
                        <button onClick={() => setApprove(r)}
                          className="px-2.5 h-7 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition-colors">
                          Review
                        </button>
                      )}
                      {r.status === 'PENDING' && (
                        <button onClick={() => cancel.mutate(r.id)}
                          disabled={cancel.isPending}
                          className="px-2.5 h-7 border border-gray-200 text-gray-500 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors disabled:opacity-40">
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showSubmit   && <SubmitModal  onClose={() => setShowSubmit(false)} />}
      {approveTarget && <ApproveModal record={approveTarget} onClose={() => setApprove(null)} />}
    </div>
  );
}
