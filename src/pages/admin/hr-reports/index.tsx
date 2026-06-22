import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, AlertTriangle, Clock, Calendar, TrendingUp } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useGetAnnualReport, useGetMonthlyReport, useGetAggregateReport } from '@/services/employeeService';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const THIS_YEAR = new Date().getFullYear();
const THIS_MONTH = new Date().getMonth() + 1;

function StatBadge({ label, value, color = 'bg-gray-100 text-gray-700' }: { label: string; value: any; color?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl p-3 min-w-[80px]', color)}>
      <span className="text-xl font-black leading-tight">{value ?? '—'}</span>
      <span className="text-xs font-semibold opacity-70 text-center leading-tight mt-0.5">{label}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-black text-gray-500 uppercase tracking-wide mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ── Aggregate View ────────────────────────────────────────────────────────────
function AggregateView() {
  const [year, setYear]   = useState(THIS_YEAR);
  const [month, setMonth] = useState(THIS_MONTH);
  const { data, isLoading } = useGetAggregateReport(year, month);

  return (
    <div className="space-y-5">
      <div className="flex gap-3 items-center">
        <select value={year} onChange={e => setYear(+e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-xl text-sm">
          {[THIS_YEAR - 1, THIS_YEAR].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(+e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-xl text-sm">
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="h-40 bg-gray-50 rounded-2xl animate-pulse" />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <SectionCard title="Monthly Summary">
            <div className="flex gap-3 flex-wrap">
              <StatBadge label="Total Leaves" value={data?.total_leave_requests}       color="bg-amber-50 text-amber-700" />
              <StatBadge label="Total Lates"  value={data?.total_latecomings}          color="bg-red-50 text-red-700" />
            </div>
          </SectionCard>
          <SectionCard title="Annual Threshold Breaches">
            <div className="flex gap-3 flex-wrap">
              <StatBadge label="Over 12 Leaves"  value={data?.employees_over_annual_leave?.length}           color="bg-orange-50 text-orange-700" />
              <StatBadge label="Over 24 Lates"   value={data?.employees_over_latecoming_threshold?.length}  color="bg-red-50 text-red-700" />
            </div>
          </SectionCard>
        </div>
      )}

      {data && (
        <>
          {/* Top latecomers */}
          {data.top_late_employees?.length > 0 && (
            <SectionCard title="Top Latecomers This Month">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2">Employee</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2">ID</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2">Designation</th>
                    <th className="text-right text-xs font-semibold text-gray-400 uppercase py-2">Late Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.top_late_employees.map((u: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2.5 font-semibold text-gray-800">{u.first_name} {u.last_name}</td>
                      <td className="py-2.5 text-gray-500 font-mono text-xs">{u.employee_id || '—'}</td>
                      <td className="py-2.5 text-gray-500">{u.designation || '—'}</td>
                      <td className="py-2.5 text-right">
                        <span className={cn('text-xs font-black px-2.5 py-1 rounded-full', u.late_count > 5 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                          {u.late_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          )}

          {/* Employees over annual leave limit */}
          {data.employees_over_annual_leave?.length > 0 && (
            <SectionCard title={`Employees Over 12 Annual Leaves in ${year}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2">Employee</th>
                    <th className="text-right text-xs font-semibold text-gray-400 uppercase py-2">Total Leaves</th>
                    <th className="text-right text-xs font-semibold text-gray-400 uppercase py-2">Excess</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.employees_over_annual_leave.map((u: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2.5 font-semibold text-gray-800">{u.first_name} {u.last_name}</td>
                      <td className="py-2.5 text-right font-bold text-gray-700">{u.total_leaves}</td>
                      <td className="py-2.5 text-right">
                        <span className="text-xs font-black px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                          +{Math.max(0, (u.total_leaves || 0) - 12)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

// ── Per-Employee View ─────────────────────────────────────────────────────────
function EmployeeView() {
  const [selectedUser, setSelectedUser] = useState('');
  const [year, setYear]   = useState(THIS_YEAR);
  const [month, setMonth] = useState(THIS_MONTH);
  const [mode, setMode]   = useState<'annual' | 'monthly'>('annual');

  const { data: users } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200&status=ACTIVE`),
    select: (r: any) => r?.payload?.records || r?.payload || [],
    staleTime: 300000,
  });

  const { data: annual, isLoading: aLoading } = useGetAnnualReport(selectedUser, year);
  const { data: monthly, isLoading: mLoading } = useGetMonthlyReport(selectedUser, year, month);

  const isLoading = mode === 'annual' ? aLoading : mLoading;
  const report    = mode === 'annual' ? annual : monthly;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-xl text-sm min-w-[200px]">
          <option value="">Select Employee</option>
          {(users || []).map((u: any) => (
            <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.employee_id || u.email})</option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-xl text-sm">
          {[THIS_YEAR - 1, THIS_YEAR].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {mode === 'monthly' && (
          <select value={month} onChange={e => setMonth(+e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm">
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        )}
        <div className="flex border border-gray-200 rounded-xl overflow-hidden">
          <button onClick={() => setMode('annual')}
            className={cn('px-4 h-10 text-sm font-semibold transition-colors', mode === 'annual' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>
            Annual
          </button>
          <button onClick={() => setMode('monthly')}
            className={cn('px-4 h-10 text-sm font-semibold transition-colors', mode === 'monthly' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>
            Monthly
          </button>
        </div>
      </div>

      {!selectedUser ? (
        <div className="py-20 text-center text-gray-300">
          <Users size={40} className="mx-auto mb-3" />
          <p className="text-sm font-semibold">Select an employee to view their report</p>
        </div>
      ) : isLoading ? (
        <div className="h-64 bg-gray-50 rounded-2xl animate-pulse" />
      ) : report ? (
        <div className="space-y-4">
          {/* Leave Summary */}
          <SectionCard title="Leave Summary">
            <div className="flex flex-wrap gap-3 mb-4">
              <StatBadge label="Approved"    value={report.leaves?.total_approved ?? report.leaves?.total}          color="bg-green-50 text-green-700" />
              <StatBadge label="Annual Days" value={report.leaves?.annual_paid_days ?? report.leaves?.total_days}   color="bg-blue-50 text-blue-700" />
              <StatBadge label="Excess Days" value={report.leaves?.excess_days ?? 0}                                color="bg-red-50 text-red-700" />
              <StatBadge label="Mon Leaves"  value={report.leaves?.monday_leave_count ?? report.leaves?.monday_count} color="bg-amber-50 text-amber-700" />
              <StatBadge label="Fri Leaves"  value={report.leaves?.friday_leave_count ?? report.leaves?.friday_count} color="bg-amber-50 text-amber-700" />
              {mode === 'annual' && <StatBadge label="Sandwich" value={report.leaves?.sandwich_leave_count} color="bg-purple-50 text-purple-700" />}
            </div>

            {/* Leave Records */}
            {report.leaves?.records?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Type','Policy','From','To','Days','Status','Mon?','Fri?'].map(h => (
                        <th key={h} className="text-left font-semibold text-gray-400 uppercase py-2 px-1">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {report.leaves.records.map((l: any) => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="py-2 px-1 font-semibold text-gray-700">{l.leave_type || '—'}</td>
                        <td className="py-2 px-1 text-gray-500">{l.policy || '—'}</td>
                        <td className="py-2 px-1 text-gray-600">{l.start_date ? new Date(l.start_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '—'}</td>
                        <td className="py-2 px-1 text-gray-600">{l.end_date ? new Date(l.end_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '—'}</td>
                        <td className="py-2 px-1 font-bold text-gray-800">{l.days}</td>
                        <td className="py-2 px-1">
                          <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded-full',
                            l.status === 'APPROVED' ? 'bg-green-100 text-green-700' : l.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700')}>
                            {l.status}
                          </span>
                        </td>
                        <td className="py-2 px-1">{l.is_monday ? <span className="text-amber-500 font-bold">Yes</span> : '—'}</td>
                        <td className="py-2 px-1">{l.is_friday ? <span className="text-amber-500 font-bold">Yes</span> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Latecoming */}
          <SectionCard title="Latecoming">
            <div className="flex flex-wrap gap-3">
              <StatBadge label="Total Late"    value={report.latecoming?.total ?? report.latecoming?.total}     color="bg-red-50 text-red-700" />
              <StatBadge label="After Grace"   value={report.latecoming?.after_grace}                           color="bg-red-50 text-red-700" />
              <StatBadge label="After 11:15"   value={report.latecoming?.after_1115 ?? report.latecoming?.after_1115} color="bg-orange-50 text-orange-700" />
              <StatBadge label="After 11:30"   value={report.latecoming?.after_1130 ?? report.latecoming?.after_1130} color="bg-red-100 text-red-800" />
            </div>
          </SectionCard>

          {/* WFH */}
          <SectionCard title="Work From Home">
            <div className="flex flex-wrap gap-3">
              <StatBadge label="WFH Days"        value={report.wfh?.wfh_count ?? report.wfh?.count}                   color="bg-blue-50 text-blue-700" />
              <StatBadge label="Converted Leaves" value={report.wfh?.wfh_converted_leaves ?? report.wfh?.converted_leaves} color="bg-amber-50 text-amber-700" />
            </div>
            <p className="text-xs text-gray-400 mt-2">Every 2 WFH days = 1 annual leave deduction.</p>
          </SectionCard>

          {/* Monthly deduction estimate */}
          {mode === 'monthly' && report.deduction_estimate && (
            <SectionCard title="Deduction Estimate">
              <div className="flex flex-wrap gap-3">
                <StatBadge label="Daily Rate (PKR)" value={Math.round(report.deduction_estimate.daily_rate).toLocaleString()} color="bg-gray-50 text-gray-700" />
                <StatBadge label="Excess Days"      value={report.deduction_estimate.excess_days}                             color="bg-orange-50 text-orange-700" />
                <StatBadge label="Est. Deduction"   value={`${Math.round(report.deduction_estimate.deduction_estimate).toLocaleString()}`} color="bg-red-50 text-red-700" />
              </div>
            </SectionCard>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-gray-400 text-sm">No data available for the selected period.</div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HRReports() {
  const [view, setView] = useState<'employee' | 'aggregate'>('aggregate');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">HR Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Leave, latecoming, and attendance analytics</p>
        </div>
        <div className="flex border border-gray-200 rounded-xl overflow-hidden">
          <button onClick={() => setView('aggregate')}
            className={cn('px-4 h-10 flex items-center gap-2 text-sm font-semibold transition-colors',
              view === 'aggregate' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>
            <BarChart3 size={15} />Aggregate
          </button>
          <button onClick={() => setView('employee')}
            className={cn('px-4 h-10 flex items-center gap-2 text-sm font-semibold transition-colors',
              view === 'employee' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>
            <Users size={15} />Per Employee
          </button>
        </div>
      </div>

      {view === 'aggregate' ? <AggregateView /> : <EmployeeView />}
    </div>
  );
}
