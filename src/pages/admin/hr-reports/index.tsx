import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart3, Users, AlertTriangle, Clock, Calendar, TrendingUp, PieChart, FileWarning, Download, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useGetAnnualReport, useGetMonthlyReport, useGetAggregateReport } from '@/services/employeeService';
import { useGetDepartmentsQuery } from '@/services/departmentService';
import { useGetGradesQuery } from '@/services/gradeService';
import { useGetTeamsQuery } from '@/services/adminService';
import { useGetDesignationsQuery } from '@/services/designationService';
import { useGetBusinessUnitsQuery } from '@/services/businessUnitService';
import { useGetMissingDocumentsReport, useGetMissingDocumentsSummary, downloadMissingDocumentsExport } from '@/services/hrService';
import { EMPLOYMENT_STATUS_LABELS } from '@/constants/employmentStatus';
import { cn } from '@/utils/cn';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Button from '@/components/ui/Button';

const v1 = 'api/v1';
const BUILDER = `${v1}/report/builder`;

type Dimension = {
  key: string; label: string; entity: string; group_by: string;
  resolveLabel?: (value: string, ctx: { departments: any[]; grades: any[]; teams: any[] }) => string;
};

const DIMENSIONS: Dimension[] = [
  { key: 'department', label: 'By Department', entity: 'users', group_by: 'department_id',
    resolveLabel: (v, { departments }) => departments.find((d) => d.id === v)?.name || 'Unassigned' },
  { key: 'designation', label: 'By Designation', entity: 'users', group_by: 'designation' },
  { key: 'grade', label: 'By Grade', entity: 'users', group_by: 'grade_id',
    resolveLabel: (v, { grades }) => grades.find((g) => g.id === v)?.name || 'Unassigned' },
  { key: 'business_unit', label: 'By Business Unit', entity: 'users', group_by: 'business_unit' },
  { key: 'status', label: 'By Employment Status', entity: 'users', group_by: 'status' },
  { key: 'team', label: 'By Team', entity: 'team_members', group_by: 'team_id',
    resolveLabel: (v, { teams }) => teams.find((t) => t.id === v)?.name || 'Unassigned' },
  { key: 'lifecycle', label: 'By Lifecycle Stage', entity: 'employee_profiles', group_by: 'lifecycle_stage' },
];

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

function AggregateView() {
  const [year, setYear]   = useState(THIS_YEAR);
  const [month, setMonth] = useState(THIS_MONTH);
  const { data, isLoading } = useGetAggregateReport(year, month);

  return (
    <div className="space-y-5">
      <div className="flex gap-3 items-center">
        <SearchableSelect
          options={[THIS_YEAR - 1, THIS_YEAR].map(y => ({ label: String(y), value: y }))}
          value={year}
          onChange={v => setYear((v as number) ?? year)}
          clearable={false}
          containerClassName="w-auto"
          className="h-10"
        />
        <SearchableSelect
          options={MONTHS.map((m, i) => ({ label: m, value: i + 1 }))}
          value={month}
          onChange={v => setMonth((v as number) ?? month)}
          clearable={false}
          containerClassName="w-auto"
          className="h-10"
        />
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

      <div className="flex flex-wrap gap-3 items-center">
        <SearchableSelect
          options={(users || []).map((u: any) => ({ label: `${u.first_name} ${u.last_name} (${u.employee_id || u.email})`, value: u.id }))}
          value={selectedUser || null}
          onChange={v => setSelectedUser((v as string) ?? '')}
          placeholder="Select Employee"
          containerClassName="min-w-[200px] w-auto"
          className="h-10"
        />
        <SearchableSelect
          options={[THIS_YEAR - 1, THIS_YEAR].map(y => ({ label: String(y), value: y }))}
          value={year}
          onChange={v => setYear((v as number) ?? year)}
          clearable={false}
          containerClassName="w-auto"
          className="h-10"
        />
        {mode === 'monthly' && (
          <SearchableSelect
            options={MONTHS.map((m, i) => ({ label: m, value: i + 1 }))}
            value={month}
            onChange={v => setMonth((v as number) ?? month)}
            clearable={false}
            containerClassName="w-auto"
            className="h-10"
          />
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

          <SectionCard title="Leave Summary">
            <div className="flex flex-wrap gap-3 mb-4">
              <StatBadge label="Approved"    value={report.leaves?.total_approved ?? report.leaves?.total}          color="bg-green-50 text-green-700" />
              <StatBadge label="Annual Days" value={report.leaves?.annual_paid_days ?? report.leaves?.total_days}   color="bg-blue-50 text-blue-700" />
              <StatBadge label="Excess Days" value={report.leaves?.excess_days ?? 0}                                color="bg-red-50 text-red-700" />
              <StatBadge label="Mon Leaves"  value={report.leaves?.monday_leave_count ?? report.leaves?.monday_count} color="bg-amber-50 text-amber-700" />
              <StatBadge label="Fri Leaves"  value={report.leaves?.friday_leave_count ?? report.leaves?.friday_count} color="bg-amber-50 text-amber-700" />
              {mode === 'annual' && <StatBadge label="Sandwich" value={report.leaves?.sandwich_leave_count} color="bg-purple-50 text-purple-700" />}
            </div>

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

          <SectionCard title="Latecoming">
            <div className="flex flex-wrap gap-3">
              <StatBadge label="Total Late"    value={report.latecoming?.total ?? report.latecoming?.total}     color="bg-red-50 text-red-700" />
              <StatBadge label="After Grace"   value={report.latecoming?.after_grace}                           color="bg-red-50 text-red-700" />
              <StatBadge label="After 11:15"   value={report.latecoming?.after_1115 ?? report.latecoming?.after_1115} color="bg-orange-50 text-orange-700" />
              <StatBadge label="After 11:30"   value={report.latecoming?.after_1130 ?? report.latecoming?.after_1130} color="bg-red-100 text-red-800" />
            </div>
          </SectionCard>

          <SectionCard title="Work From Home">
            <div className="flex flex-wrap gap-3">
              <StatBadge label="WFH Days"        value={report.wfh?.wfh_count ?? report.wfh?.count}                   color="bg-blue-50 text-blue-700" />
              <StatBadge label="Converted Leaves" value={report.wfh?.wfh_converted_leaves ?? report.wfh?.converted_leaves} color="bg-amber-50 text-amber-700" />
            </div>
            <p className="text-xs text-gray-400 mt-2">Every 2 WFH days = 1 annual leave deduction.</p>
          </SectionCard>

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

function WorkforceBreakdown() {
  const [dimKey, setDimKey] = useState(DIMENSIONS[0].key);
  const dimension = DIMENSIONS.find((d) => d.key === dimKey)!;

  const { data: departments } = useGetDepartmentsQuery();
  const { data: grades } = useGetGradesQuery();
  const { data: teamsRaw } = useGetTeamsQuery();
  const teams = (teamsRaw as any)?.payload?.records || (teamsRaw as any)?.payload || [];

  const aggregateMutation = useMutation({
    mutationFn: (body: { entity: string; group_by: string }) =>
      apiRequest<any>(`${BUILDER}/aggregate`, { method: 'POST', body: JSON.stringify(body) }).then((r) => r?.payload),
  });

  React.useEffect(() => {
    aggregateMutation.mutate({ entity: dimension.entity, group_by: dimension.group_by });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimKey]);

  const rows = useMemo(() => {
    const raw = aggregateMutation.data?.rows || [];
    return raw.map((r: any) => ({
      label: dimension.resolveLabel
        ? dimension.resolveLabel(r[dimension.group_by], { departments: departments || [], grades: grades || [], teams })
        : (r[dimension.group_by] ? String(r[dimension.group_by]).replace(/_/g, ' ') : 'Unassigned'),
      count: r.count,
    }));
  }, [aggregateMutation.data, dimension, departments, grades, teams]);

  const total = aggregateMutation.data?.total ?? 0;
  const maxCount = Math.max(1, ...rows.map((r: any) => r.count));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {DIMENSIONS.map((d) => (
          <button
            key={d.key}
            onClick={() => setDimKey(d.key)}
            className={cn('px-3.5 h-9 rounded-xl text-xs font-semibold transition-colors',
              dimKey === d.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            {d.label}
          </button>
        ))}
      </div>

      <SectionCard title={`Employee Summary — ${dimension.label}`}>
        {aggregateMutation.isPending ? (
          <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">No data for this dimension.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-black text-gray-900 text-lg">{total}</span>
              <span className="text-gray-400">total employees</span>
            </div>
            <div className="space-y-2.5">
              {rows.map((r: any) => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-600 w-40 truncate">{r.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-primary-500" style={{ width: `${(r.count / maxCount) * 100}%` }} />
                  </div>
                  <span className="text-xs font-black text-gray-900 tabular-nums w-8 text-right">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function MissingDocumentsView() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: departments } = useGetDepartmentsQuery();
  const { data: designations } = useGetDesignationsQuery();
  const { data: businessUnits } = useGetBusinessUnitsQuery();
  const teamsRaw = useGetTeamsQuery().data as any;
  const teams = teamsRaw?.payload?.records || teamsRaw?.payload || [];

  const activeFilters = useMemo(() => ({ ...filters, page, limit }), [filters, page]);
  const { data: summary, isLoading: summaryLoading } = useGetMissingDocumentsSummary(filters);
  const { data: report, isLoading: reportLoading } = useGetMissingDocumentsReport(activeFilters);

  const setFilter = (key: string, value: string) => {
    setFilters((p) => ({ ...p, [key]: value }));
    setPage(1);
  };

  const [exporting, setExporting] = useState<string | null>(null);
  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    setExporting(format);
    try {
      await downloadMissingDocumentsExport(format, filters);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-5">

      {summaryLoading ? (
        <div className="h-20 bg-gray-50 rounded-2xl animate-pulse" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SectionCard title="Total Employees"><span className="text-2xl font-black text-gray-900">{summary?.total_employees ?? '—'}</span></SectionCard>
          <SectionCard title="Complete Documents"><span className="text-2xl font-black text-green-600">{summary?.employees_complete ?? '—'}</span></SectionCard>
          <SectionCard title="Missing Documents"><span className="text-2xl font-black text-red-600">{summary?.employees_with_missing ?? '—'}</span></SectionCard>
          <SectionCard title="Total Missing Docs"><span className="text-2xl font-black text-orange-600">{summary?.total_missing_documents ?? '—'}</span></SectionCard>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <SearchableSelect
          options={(businessUnits || []).map((b: any) => ({ label: b.name, value: b.id }))}
          value={filters.business_unit_id || null}
          onChange={(v) => setFilter('business_unit_id', (v as string) || '')}
          placeholder="All Business Units"
          containerClassName="min-w-[160px] w-auto" className="h-10"
        />
        <SearchableSelect
          options={(departments || []).map((d: any) => ({ label: d.name, value: d.id }))}
          value={filters.department_id || null}
          onChange={(v) => setFilter('department_id', (v as string) || '')}
          placeholder="All Departments"
          containerClassName="min-w-[160px] w-auto" className="h-10"
        />
        <SearchableSelect
          options={teams.map((t: any) => ({ label: t.name, value: t.id }))}
          value={filters.team_id || null}
          onChange={(v) => setFilter('team_id', (v as string) || '')}
          placeholder="All Teams"
          containerClassName="min-w-[140px] w-auto" className="h-10"
        />
        <SearchableSelect
          options={(designations || []).map((d: any) => ({ label: d.name, value: d.id }))}
          value={filters.designation_id || null}
          onChange={(v) => setFilter('designation_id', (v as string) || '')}
          placeholder="All Designations"
          containerClassName="min-w-[160px] w-auto" className="h-10"
        />
        <SearchableSelect
          options={Object.entries(EMPLOYMENT_STATUS_LABELS).map(([value, label]) => ({ label, value }))}
          value={filters.employment_status || null}
          onChange={(v) => setFilter('employment_status', (v as string) || '')}
          placeholder="All Employment Status"
          containerClassName="min-w-[160px] w-auto" className="h-10"
        />
        <SearchableSelect
          options={report?.required_document_types || []}
          value={filters.missing_document_type || null}
          onChange={(v) => setFilter('missing_document_type', (v as string) || '')}
          placeholder="Any Missing Doc Type"
          containerClassName="min-w-[170px] w-auto" className="h-10"
        />
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" loading={exporting === 'excel'} onClick={() => handleExport('excel')}>
            <Download size={13} className="mr-1.5" />Excel
          </Button>
          <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" loading={exporting === 'csv'} onClick={() => handleExport('csv')}>
            <Download size={13} className="mr-1.5" />CSV
          </Button>
          <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" loading={exporting === 'pdf'} onClick={() => handleExport('pdf')}>
            <Download size={13} className="mr-1.5" />PDF
          </Button>
        </div>
      </div>

      <SectionCard title="Employees with Missing Documents">
        {reportLoading ? (
          <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />
        ) : !report?.records?.length ? (
          <p className="text-sm text-gray-400 py-8 text-center">No employees match these filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Employee ID', 'Name', 'Business Unit', 'Department', 'Team', 'Designation', 'Status', 'Missing Documents', 'Total Missing', ''].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.records.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-2 text-gray-500 font-mono text-xs whitespace-nowrap">{r.employee_id || '—'}</td>
                      <td className="py-2.5 px-2 font-semibold text-gray-800 whitespace-nowrap">{r.employee_name}</td>
                      <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">{r.business_unit || '—'}</td>
                      <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">{r.department || '—'}</td>
                      <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">{r.team || '—'}</td>
                      <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">{r.designation || '—'}</td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{EMPLOYMENT_STATUS_LABELS[r.employment_status] || r.employment_status || '—'}</span>
                      </td>
                      <td className="py-2.5 px-2 max-w-[260px]">
                        <div className="flex flex-wrap gap-1">
                          {r.missing_documents.length === 0 ? (
                            <span className="text-xs text-green-600 font-semibold">Complete</span>
                          ) : r.missing_documents.map((d: string) => (
                            <span key={d} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">{d}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={cn('text-xs font-black px-2 py-1 rounded-full', r.total_missing > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>{r.total_missing}</span>
                      </td>
                      <td className="py-2.5 px-2">
                        <Link to={`/admin/employee/${r.id}`} className="text-xs text-[#005CDA] font-semibold inline-flex items-center gap-1 whitespace-nowrap">
                          Profile<ExternalLink size={11} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
              <span>{report.total} employee{report.total === 1 ? '' : 's'} total</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <span className="px-2 py-1.5">Page {page} of {Math.max(1, Math.ceil((report.total || 0) / limit))}</span>
                <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" disabled={page * limit >= (report.total || 0)} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

export default function HRReports() {
  const [view, setView] = useState<'employee' | 'aggregate' | 'workforce' | 'missing-documents'>('aggregate');

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
          <button onClick={() => setView('workforce')}
            className={cn('px-4 h-10 flex items-center gap-2 text-sm font-semibold transition-colors',
              view === 'workforce' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>
            <PieChart size={15} />Workforce Breakdown
          </button>
          <button onClick={() => setView('missing-documents')}
            className={cn('px-4 h-10 flex items-center gap-2 text-sm font-semibold transition-colors',
              view === 'missing-documents' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>
            <FileWarning size={15} />Missing Documents
          </button>
        </div>
      </div>

      {view === 'aggregate' ? <AggregateView />
        : view === 'employee' ? <EmployeeView />
        : view === 'workforce' ? <WorkforceBreakdown />
        : <MissingDocumentsView />}
    </div>
  );
}
