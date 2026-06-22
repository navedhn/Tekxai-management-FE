import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Plus, Check, X, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import {
  useGetIncrementHistory,
  useCalculateIncrement,
  useCreateIncrement,
  useUpdateIncrement,
} from '@/services/employeeService';
import { cn } from '@/lib/utils';

const THIS_YEAR = new Date().getFullYear();

const STATUS_STYLE: Record<string, string> = {
  DRAFT:    'bg-gray-100 text-gray-500',
  PENDING:  'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
};

function PctBadge({ label, pct, eligible = true }: { label: string; pct: number; eligible?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl p-3 min-w-[80px]',
      eligible ? 'bg-green-50' : 'bg-gray-50')}>
      <span className={cn('text-lg font-black', eligible ? 'text-green-700' : 'text-gray-400')}>{pct}%</span>
      <span className="text-xs font-semibold text-gray-400 text-center">{label}</span>
    </div>
  );
}

// ── Create / Calculate Increment Modal ───────────────────────────────────────
function IncrementModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [year, setYear]      = useState(THIS_YEAR);
  const [calcEnabled, setCalcEnabled] = useState(false);
  const [overrides, setOverrides] = useState({
    performance_pct: '', notes: '', review_period: `${THIS_YEAR}`,
    effective_date: '',
  });

  const { data: calc, isLoading } = useCalculateIncrement(userId, year, calcEnabled);
  const create = useCreateIncrement(userId);

  const handleCreate = () => {
    if (!calc) return;
    create.mutate({
      review_year:             year,
      review_period:           overrides.review_period,
      effective_date:          overrides.effective_date || undefined,
      previous_salary:         calc.previous_salary,
      mandatory_pct:           calc.mandatory_pct,
      performance_pct:         overrides.performance_pct ? +overrides.performance_pct : calc.performance_pct,
      regularity_pct:          calc.regularity_pct,
      punctuality_pct:         calc.punctuality_pct,
      total_pct:               overrides.performance_pct
        ? (calc.mandatory_pct + (+overrides.performance_pct) + calc.regularity_pct + calc.punctuality_pct)
        : calc.total_pct,
      regularity_eligible:     calc.regularity_eligible,
      punctuality_eligible:    calc.punctuality_eligible,
      leave_count_snapshot:    calc.leave_count_snapshot,
      latecoming_count_snapshot: calc.latecoming_count_snapshot,
      increment_amount:        calc.increment_amount,
      new_salary:              calc.new_salary,
      notes:                   overrides.notes || undefined,
    }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">New Increment</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        {/* Year select + calculate */}
        <div className="flex gap-3 mb-5">
          <select value={year} onChange={e => { setYear(+e.target.value); setCalcEnabled(false); }}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm flex-1">
            {[THIS_YEAR - 1, THIS_YEAR].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setCalcEnabled(true)}
            className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />Calculate
          </button>
        </div>

        {calc && (
          <div className="space-y-5">
            {/* Recommendation */}
            <div className="bg-primary-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-2">Calculated Recommendation</p>
              <div className="flex flex-wrap gap-2 mb-3">
                <PctBadge label="Mandatory" pct={calc.mandatory_pct} />
                <PctBadge label="Performance" pct={calc.performance_pct} />
                <PctBadge label="Regularity" pct={calc.regularity_pct} eligible={calc.regularity_eligible} />
                <PctBadge label="Punctuality" pct={calc.punctuality_pct} eligible={calc.punctuality_eligible} />
              </div>
              <div className="flex items-center justify-between bg-white rounded-xl p-3">
                <span className="text-sm font-semibold text-gray-700">Total Increment</span>
                <span className="text-xl font-black text-primary-700">{calc.total_pct}%</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="bg-white rounded-lg p-2.5">
                  <span className="text-gray-400">Current Salary</span>
                  <p className="font-black text-gray-800 mt-0.5">PKR {Math.round(calc.previous_salary || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg p-2.5">
                  <span className="text-gray-400">New Salary</span>
                  <p className="font-black text-green-700 mt-0.5">PKR {Math.round(calc.new_salary || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg p-2.5">
                  <span className="text-gray-400">Leaves in {year}</span>
                  <p className="font-bold text-gray-700 mt-0.5">{calc.leave_count_snapshot ?? '—'} {(calc.leave_count_snapshot ?? 0) > 12 && <span className="text-red-500 text-xs">{'(>12)'}</span>}</p>
                </div>
                <div className="bg-white rounded-lg p-2.5">
                  <span className="text-gray-400">Lates in {year}</span>
                  <p className="font-bold text-gray-700 mt-0.5">{calc.latecoming_count_snapshot ?? '—'} {(calc.latecoming_count_snapshot ?? 0) > 24 && <span className="text-red-500 text-xs">{'(>24)'}</span>}</p>
                </div>
              </div>
              {(!calc.regularity_eligible || !calc.punctuality_eligible) && (
                <div className="bg-amber-50 rounded-lg p-2.5 mt-2 text-xs text-amber-700">
                  {!calc.regularity_eligible && <p>Regularity bonus not eligible: {calc.regularity_exclusion_reason}</p>}
                  {!calc.punctuality_eligible && <p>Punctuality bonus not eligible: {calc.punctuality_exclusion_reason}</p>}
                </div>
              )}
            </div>

            {/* Overrides */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Performance % Override</label>
                <input type="number" value={overrides.performance_pct}
                  onChange={e => setOverrides(p => ({ ...p, performance_pct: e.target.value }))}
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
                  placeholder={`Calculated: ${calc.performance_pct}%`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Effective Date</label>
                <input type="date" value={overrides.effective_date}
                  onChange={e => setOverrides(p => ({ ...p, effective_date: e.target.value }))}
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Notes</label>
                <textarea value={overrides.notes} onChange={e => setOverrides(p => ({ ...p, notes: e.target.value }))}
                  className="w-full h-16 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
                  placeholder="Internal notes…" />
              </div>
            </div>

            <button onClick={handleCreate} disabled={create.isPending}
              className="w-full h-10 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors">
              {create.isPending ? 'Creating…' : 'Create Increment Record'}
            </button>
            {create.isError && <p className="text-red-500 text-xs text-center">{(create.error as Error)?.message}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Increments Page ─────────────────────────────────────────────────────
export default function IncrementsPage() {
  const [selectedUser, setSelectedUser] = useState('');
  const [showModal, setShowModal]       = useState(false);

  const { data: users } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200&status=ACTIVE`),
    select: (r: any) => r?.payload?.records || r?.payload || [],
    staleTime: 300000,
  });

  const { data: history, isLoading } = useGetIncrementHistory(selectedUser);
  const update = useUpdateIncrement(selectedUser);
  const records: any[] = history?.records || [];

  const handleStatusChange = (id: string, status: string) => {
    update.mutate({ id, status });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Increment Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">Annual salary increments based on policy components</p>
        </div>
        {selectedUser && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
            <Plus size={16} />New Increment
          </button>
        )}
      </div>

      {/* Employee picker */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-xl text-sm w-full max-w-xs">
          <option value="">Select Employee to view history</option>
          {(users || []).map((u: any) => (
            <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.employee_id || u.email})</option>
          ))}
        </select>
      </div>

      {!selectedUser ? (
        <div className="py-20 text-center text-gray-300">
          <TrendingUp size={40} className="mx-auto mb-3" />
          <p className="text-sm font-semibold">Select an employee to view increment history</p>
        </div>
      ) : isLoading ? (
        <div className="h-40 bg-gray-50 rounded-2xl animate-pulse" />
      ) : records.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <TrendingUp size={32} className="mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-400">No increment records found for this employee.</p>
          <button onClick={() => setShowModal(true)}
            className="mt-3 flex items-center gap-2 px-4 h-9 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors mx-auto">
            <Plus size={14} />Create First Increment
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Year','Period','Mandatory','Perform.','Regular.','Punct.','Total %','Old Salary','New Salary','Effective','Status','Actions']
                  .map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-3 whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-3 font-bold text-gray-900">{r.review_year}</td>
                  <td className="py-3 px-3 text-gray-600">{r.review_period}</td>
                  <td className="py-3 px-3 text-center">{r.mandatory_pct}%</td>
                  <td className="py-3 px-3 text-center">{r.performance_pct}%</td>
                  <td className="py-3 px-3 text-center">
                    <span className={r.regularity_eligible ? 'text-green-600 font-semibold' : 'text-gray-300 line-through'}>{r.regularity_pct}%</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={r.punctuality_eligible ? 'text-green-600 font-semibold' : 'text-gray-300 line-through'}>{r.punctuality_pct}%</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-primary-700 font-black">{r.total_pct}%</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-xs text-gray-600">
                    {r.previous_salary ? Math.round(r.previous_salary).toLocaleString() : '—'}
                  </td>
                  <td className="py-3 px-3 font-mono text-xs font-bold text-green-700">
                    {r.new_salary ? Math.round(r.new_salary).toLocaleString() : '—'}
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">
                    {r.effective_date ? new Date(r.effective_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                  </td>
                  <td className="py-3 px-3">
                    <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-500')}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {r.status === 'PENDING' && (
                      <div className="flex gap-1">
                        <button onClick={() => handleStatusChange(r.id, 'APPROVED')}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                          <Check size={14} />
                        </button>
                        <button onClick={() => handleStatusChange(r.id, 'REJECTED')}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    {r.status === 'DRAFT' && (
                      <button onClick={() => handleStatusChange(r.id, 'PENDING')}
                        className="text-xs px-2.5 py-1 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors font-semibold">
                        Submit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedUser && (
        <IncrementModal userId={selectedUser} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
