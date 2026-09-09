import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Tabs from '@/components/ui/Tabs';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Button, { IconButton } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import StatusBadge from '@/components/ui/StatusBadge';
import ActionModal from '@/components/ui/ActionModal';
import ChipMultiSelect from '@/components/ui/ChipMultiSelect';
import {
  Clock, AlertTriangle, Plus, Pencil, Trash2, BarChart3, FileDown, FileSpreadsheet,
  FileText, Search, X, Eye, UserCheck, Users,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useGetShiftsQuery, useGetViolationsQuery, useUpsertShiftMutation, useAssignShiftMutation, useDeleteShiftMutation, useGetNoCheckinsQuery, useMarkAbsenteesMutation, exportNoCheckinPdf, useGetOrgAttendanceSummaryQuery, useGetOrgFilterOptionsQuery } from '@/services/attendanceService';
import { useGetEmployeeDirectory } from '@/services/employeeService';
import { useGetTeamsQuery } from '@/services/adminService';
import { useGetDesignationsQuery } from '@/services/designationService';
import { apiRequest } from '@/lib/queryClient';

const TABS = ['Overview', 'Late Coming', 'No Check-in Today', 'Shift Management', 'Violations', 'Reports'];
const v1 = 'api/v1';
const BUILDER = `${v1}/report/builder`;

function toDateInputStr(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getTodayRange() {
  const today = toDateInputStr(new Date());
  return { start_date: today, end_date: today };
}

function getThisWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start_date: toDateInputStr(monday), end_date: toDateInputStr(sunday) };
}

function SummaryCard({ icon: Icon, label, value, subtitle, iconBg, iconColor }: {
  icon: any; label: string; value: React.ReactNode; subtitle: string; iconBg: string; iconColor: string;
}) {
  return (
    <div className="flex items-center gap-3.5 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        <Icon size={20} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-gray-900 leading-tight tabular-nums">{value}</p>
        <p className="text-xs font-bold text-gray-600 truncate">{label}</p>
        <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>
      </div>
    </div>
  );
}

function AttendanceReportsTab({ users }: { users: any[] }) {
  const [dimKey, setDimKey] = useState<'type' | 'employee'>('type');

  const kpiCall = (entity: string, metric: string, filters?: any) =>
    apiRequest<any>(`${BUILDER}/kpi`, { method: 'POST', body: JSON.stringify({ entity, metric, field: metric === 'COUNT' ? undefined : 'late_mins', filters }) }).then((r: any) => r?.payload?.value ?? 0);

  const lateQ = useQuery({ queryKey: ['attendance-kpi-late'], queryFn: () => kpiCall('attendance_violations', 'COUNT', { violation_type: 'LATE' }) });
  const absentQ = useQuery({ queryKey: ['attendance-kpi-absent'], queryFn: () => kpiCall('attendance_violations', 'COUNT', { violation_type: 'ABSENT' }) });
  const lateMinsQ = useQuery({ queryKey: ['attendance-kpi-late-mins'], queryFn: () => kpiCall('attendance_violations', 'SUM') });
  const entriesQ = useQuery({ queryKey: ['attendance-kpi-entries'], queryFn: () => kpiCall('timesheet_entries', 'COUNT') });

  const cards = [
    { icon: AlertTriangle, color: 'bg-yellow-500', label: 'Late Violations', value: lateQ.data },
    { icon: AlertTriangle, color: 'bg-red-500', label: 'Absent Violations', value: absentQ.data },
    { icon: Clock, color: 'bg-orange-500', label: 'Total Late Minutes', value: lateMinsQ.data },
    { icon: BarChart3, color: 'bg-indigo-500', label: 'Timesheet Entries', value: entriesQ.data },
  ];

  const aggregateMutation = useMutation({
    mutationFn: (body: { entity: string; group_by: string; metric_field?: string }) =>
      apiRequest<any>(`${BUILDER}/aggregate`, { method: 'POST', body: JSON.stringify(body) }).then((r: any) => r?.payload),
  });

  React.useEffect(() => {
    if (dimKey === 'type') aggregateMutation.mutate({ entity: 'attendance_violations', group_by: 'violation_type' });
    else aggregateMutation.mutate({ entity: 'attendance_violations', group_by: 'user_id', metric_field: 'late_mins' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimKey]);

  const rows = useMemo(() => {
    const raw = aggregateMutation.data?.rows || [];
    return raw.map((r: any) => {
      let label = dimKey === 'type' ? r.violation_type : (users.find((u: any) => u.id === r.user_id)?.first_name ? `${users.find((u: any) => u.id === r.user_id).first_name} ${users.find((u: any) => u.id === r.user_id).last_name}` : r.user_id);
      return { label, count: r.count, value: r.value };
    });
  }, [aggregateMutation.data, dimKey, users]);

  const max = Math.max(1, ...rows.map((r: any) => (dimKey === 'employee' ? r.value : r.count)));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', c.color)}>
              <c.icon size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{c.label}</p>
              <p className="text-xl font-black text-gray-900 leading-tight">{c.value ?? '—'}</p>
            </div>
          </div>
        ))}
      </div>

      <Card className="border-none shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Violations Breakdown</p>
          <div className="flex gap-1.5">
            <button onClick={() => setDimKey('type')} className={cn('px-3 h-8 rounded-lg text-xs font-semibold transition-colors', dimKey === 'type' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>By Type</button>
            <button onClick={() => setDimKey('employee')} className={cn('px-3 h-8 rounded-lg text-xs font-semibold transition-colors', dimKey === 'employee' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>Top Late Employees</button>
          </div>
        </div>
        {aggregateMutation.isPending ? (
          <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No violation data.</p>
        ) : (
          <div className="space-y-2.5">
            {rows.map((r: any, i: number) => (
              <div key={`${r.label}-${i}`} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-600 w-36 truncate">{r.label || 'Unknown'}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-yellow-500" style={{ width: `${((dimKey === 'employee' ? r.value : r.count) / max) * 100}%` }} />
                </div>
                <span className="text-xs font-black text-gray-900 tabular-nums w-16 text-right">{dimKey === 'employee' ? `${r.value} min` : r.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

const AttendancePage: React.FC = () => {
  const toast = useToastContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [shiftToDelete, setShiftToDelete] = useState<any>(null);
  const [shiftForm, setShiftForm] = useState({ name: '', start_time: '09:00', end_time: '18:00', grace_period_min: 15, is_default: false });
  const EMPTY_ASSIGN_FORM = { user_id: '', shift_id: '' };
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN_FORM);
  const [assignMode, setAssignMode] = useState<'employee' | 'team'>('employee');
  const [assignTeamIds, setAssignTeamIds] = useState<string[]>([]);
  const [violationFilters, setViolationFilters] = useState({ user_id: '', violation_type: '', start_date: '', end_date: '' });
  const [lateQuickFilter, setLateQuickFilter] = useState<'today' | 'week' | null>(null);
  const [lateDateRange, setLateDateRange] = useState({ start_date: '', end_date: '' });
  const [noCheckinDeptFilter, setNoCheckinDeptFilter] = useState('');
  const [noCheckinBuFilter, setNoCheckinBuFilter] = useState('');
  const [noCheckinTeamFilter, setNoCheckinTeamFilter] = useState('');
  const [noCheckinEmployeeFilter, setNoCheckinEmployeeFilter] = useState('');
  const [noCheckinShiftFilter, setNoCheckinShiftFilter] = useState('');
  const [noCheckinSearch, setNoCheckinSearch] = useState('');
  // Business Unit -> Department -> Team -> Employee: changing a parent
  // clears any child selection that would otherwise widen/become invalid
  // under the new parent (the option lists themselves are also re-fetched
  // scoped to the new parent — see orgFilterOptions below).
  const setNoCheckinBuFilterAndClearChildren = (value: string) => {
    setNoCheckinBuFilter(value);
    setNoCheckinDeptFilter('');
    setNoCheckinTeamFilter('');
    setNoCheckinEmployeeFilter('');
  };
  const setNoCheckinDeptFilterAndClearChildren = (value: string) => {
    setNoCheckinDeptFilter(value);
    setNoCheckinTeamFilter('');
    setNoCheckinEmployeeFilter('');
  };
  const setNoCheckinTeamFilterAndClearChildren = (value: string) => {
    setNoCheckinTeamFilter(value);
    setNoCheckinEmployeeFilter('');
  };
  const [exportingPdf, setExportingPdf] = useState(false);

  const applyLateQuickFilter = (which: 'today' | 'week') => {
    const range = which === 'today' ? getTodayRange() : getThisWeekRange();
    setLateQuickFilter(which);
    setLateDateRange(range);
  };
  const clearLateDateFilter = () => {
    setLateQuickFilter(null);
    setLateDateRange({ start_date: '', end_date: '' });
  };
  const clearDateFilter = () => {
    setViolationFilters(p => ({ ...p, start_date: '', end_date: '' }));
  };

  const { data: violationsData, isLoading: vLoading } = useGetViolationsQuery(violationFilters);
  const { data: lateData, isLoading: lateLoading } = useGetViolationsQuery({ violation_type: 'LATE', ...lateDateRange });

  const { data: lateTodayData } = useGetViolationsQuery({ violation_type: 'LATE', ...getTodayRange() });
  const { data: shifts = [], isLoading: sLoading } = useGetShiftsQuery();
  const { data: employeeDirectory } = useGetEmployeeDirectory({ limit: 100 });
  const users = employeeDirectory?.records || [];
  const { data: teamsData } = useGetTeamsQuery();
  const teams = (teamsData as any)?.payload?.records || [];
  const { data: designationsData = [] } = useGetDesignationsQuery();
  const designations = (designationsData as any) || [];
  const upsertShift = useUpsertShiftMutation();
  const assignShift = useAssignShiftMutation();
  const deleteShift = useDeleteShiftMutation();
  const noCheckinFilters = {
    department_id: noCheckinDeptFilter,
    business_unit_id: noCheckinBuFilter,
    team_id: noCheckinTeamFilter,
    employee_id: noCheckinEmployeeFilter,
  };
  const { data: noCheckinsData, isLoading: noCheckinsLoading } = useGetNoCheckinsQuery(noCheckinFilters);
  const markAbsentees = useMarkAbsenteesMutation();
  const noCheckinsRaw = (noCheckinsData as any)?.records || [];
  // Total Employees/Present/On Leave/Late/Not Checked In — same
  // Business Unit -> Department -> Team -> Employee filters as the roster
  // above, backend-scoped (attendance.repository.js's
  // get_org_scoped_attendance_summary, built on the same
  // build_active_roster_where the roster query already uses), not derived
  // from the currently-rendered/paginated table.
  const { data: orgSummary } = useGetOrgAttendanceSummaryQuery(noCheckinFilters);
  const noCheckinSummary = orgSummary || { total_employees: 0, checked_in: 0, not_checked_in: 0, on_leave: 0, late: 0 };
  // Dependent option lists — each level scoped to whichever parent(s) are
  // already selected AND to the caller's own RBAC-forced department (the
  // backend, not this hook, enforces that forcing).
  const { data: orgFilterOptions } = useGetOrgFilterOptionsQuery({
    business_unit_id: noCheckinBuFilter,
    department_id: noCheckinDeptFilter,
    team_id: noCheckinTeamFilter,
  });
  const orgBusinessUnits = orgFilterOptions?.business_units || [];
  const orgDepartments = orgFilterOptions?.departments || [];
  const orgTeams = orgFilterOptions?.teams || [];
  const orgEmployees = orgFilterOptions?.employees || [];
  const noCheckins = useMemo(() => {
    let rows = noCheckinsRaw;
    if (noCheckinShiftFilter) rows = rows.filter((r: any) => r.shift?.id === noCheckinShiftFilter);
    if (noCheckinSearch.trim()) {
      const q = noCheckinSearch.trim().toLowerCase();
      rows = rows.filter((r: any) =>
        `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.employee_id || '').toLowerCase().includes(q));
    }
    return rows;
  }, [noCheckinsRaw, noCheckinShiftFilter, noCheckinSearch]);
  const noCheckinFiltersActive = !!(noCheckinDeptFilter || noCheckinBuFilter || noCheckinTeamFilter || noCheckinEmployeeFilter || noCheckinShiftFilter || noCheckinSearch);
  const clearNoCheckinFilters = () => {
    setNoCheckinDeptFilter('');
    setNoCheckinBuFilter('');
    setNoCheckinTeamFilter('');
    setNoCheckinEmployeeFilter('');
    setNoCheckinShiftFilter('');
    setNoCheckinSearch('');
  };
  const todayLateCount = (lateTodayData as any)?.total ?? (lateTodayData as any)?.records?.length ?? 0;

  const noCheckinExportRows = (rows: any[]) => rows.map((item: any) => ({
    employee_id: item.employee_id || '—',
    name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || '—',
    department: item.department?.name || '—',
    designation: item.designation_ref?.name || item.designation || '—',
    shift: item.shift?.name || '—',
    expected_checkin: item.shift?.start_time || '—',
    reporting_manager: item.supervisor ? `${item.supervisor.first_name || ''} ${item.supervisor.last_name || ''}`.trim() : '—',
  }));
  const NOCHECKIN_EXPORT_COLUMNS = [
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'name', label: 'Employee' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'shift', label: 'Shift' },
    { key: 'expected_checkin', label: 'Expected Check-in' },
    { key: 'reporting_manager', label: 'Reporting Manager' },
  ];

  const handleExportNoCheckinPdf = async () => {
    setExportingPdf(true);
    try {
      await exportNoCheckinPdf(noCheckinFilters);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportNoCheckinCsv = () => {
    const rows = noCheckinExportRows(noCheckins);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = NOCHECKIN_EXPORT_COLUMNS.map((c) => esc(c.label)).join(',');
    const body = rows.map((r: any) => NOCHECKIN_EXPORT_COLUMNS.map((c) => esc((r as any)[c.key])).join(',')).join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `No_Check_In_Report_${toDateInputStr(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportNoCheckinExcel = () => {
    const rows = noCheckinExportRows(noCheckins);
    const ws = XLSX.utils.json_to_sheet(rows, { header: NOCHECKIN_EXPORT_COLUMNS.map((c) => c.key) });
    XLSX.utils.sheet_add_aoa(ws, [NOCHECKIN_EXPORT_COLUMNS.map((c) => c.label)], { origin: 'A1' });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'No Check-in Today');
    XLSX.writeFile(wb, `No_Check_In_Report_${toDateInputStr(new Date())}.xlsx`);
  };

  const handleMarkAbsentees = async () => {
    try {
      const result: any = await markAbsentees.mutateAsync(undefined);
      toast.success(result?.message || 'Absentees marked');
    } catch (e: any) { toast.error(e?.message || 'Failed to mark absentees'); }
  };

  const violations = (violationsData as any)?.records || [];
  const lateViolations = (lateData as any)?.records || [];

  const violationCols: Column<any>[] = [
    { header: 'Employee', key: 'user_id', render: (item) => <span className="font-bold">{item.user?.first_name} {item.user?.last_name}</span> },
    { header: 'Date', key: 'date', render: (item) => new Date(item.date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) },
    { header: 'Late (mins)', key: 'late_mins', render: (item) => <span className="font-black text-red-500">{item.late_mins || 0}</span> },
    { header: 'Type', key: 'violation_type', render: (item) => (
      <StatusBadge status={item.violation_type} label={item.violation_type} size="sm" className="rounded-lg" />
    )},
    { header: 'Remarks', key: 'remarks', render: (item) => <span className="text-gray-500">{item.remarks || '—'}</span> },
  ];

  const lateCols: Column<any>[] = [
    { header: 'Employee', key: 'user_id', render: (item) => <span className="font-bold">{item.user?.first_name} {item.user?.last_name}</span> },
    { header: 'Date', key: 'date', render: (item) => new Date(item.date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) },
    { header: 'Late (mins)', key: 'late_mins', render: (item) => <span className="font-black text-amber-600">{item.late_mins || 0}</span> },
    { header: 'Remarks', key: 'remarks', render: (item) => <span className="text-gray-500">{item.remarks || '—'}</span> },
  ];

  const openEditShift = (shift: any) => {
    setEditingShift(shift);
    setShiftForm({ name: shift.name, start_time: shift.start_time, end_time: shift.end_time, grace_period_min: shift.grace_period_min, is_default: shift.is_default });
    setShowShiftModal(true);
  };

  const handleDeleteShift = (shift: any) => setShiftToDelete(shift);

  const confirmDeleteShift = async () => {
    if (!shiftToDelete) return;
    try {
      await deleteShift.mutateAsync(shiftToDelete.id);
      toast.success('Shift deleted');
    } catch (e: any) { toast.error(e?.message || 'Failed to delete shift'); }
    finally { setShiftToDelete(null); }
  };

  const shiftCols: Column<any>[] = [
    { header: 'Shift Name', key: 'name', render: (item) => <span className="font-black">{item.name}</span> },
    { header: 'Start', key: 'start_time', render: (item) => <span className="font-mono">{item.start_time}</span> },
    { header: 'End', key: 'end_time', render: (item) => <span className="font-mono">{item.end_time}</span> },
    { header: 'Grace Period', key: 'grace_period_min', render: (item) => <span>{item.grace_period_min} min</span> },
    { header: 'Assigned', key: 'assigned_employees', render: (item) => {
      const assignees = item.assigned_employees || [];
      if (assignees.length === 0) return <span className="text-gray-400 text-xs">None</span>;
      const names = assignees.map((u: any) => `${u.first_name} ${u.last_name}`).join(', ');
      return (
        <span className="text-xs font-bold text-gray-600" title={names}>
          {assignees.length} employee{assignees.length === 1 ? '' : 's'}
        </span>
      );
    } },
    { header: 'Default', key: 'is_default', render: (item) => item.is_default ? <Badge variant="success" className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded-lg">Default</Badge> : null },
    { header: 'Actions', key: 'actions', render: (item) => (
      <div className="flex items-center gap-2">
        <IconButton icon={Pencil} variant="ghost" size="sm" aria-label="Edit shift" onClick={() => openEditShift(item)} className="!h-auto !w-auto p-1 text-gray-500 hover:text-primary-600" />
        <IconButton icon={Trash2} variant="ghost" size="sm" aria-label="Delete shift" onClick={() => handleDeleteShift(item)} className="!h-auto !w-auto p-1 text-gray-500 hover:text-red-500" />
      </div>
    )},
  ];

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.name.trim()) { toast.error('Shift name is required'); return; }
    try {
      await upsertShift.mutateAsync(editingShift ? { ...shiftForm, id: editingShift.id } : shiftForm);
      toast.success(editingShift ? 'Shift updated' : 'Shift created');
      setShowShiftModal(false);
      setEditingShift(null);
    } catch (e: any) { toast.error(e?.message || 'Failed to save shift'); }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assignMode === 'team') {
      if (assignTeamIds.length === 0 || !assignForm.shift_id) { toast.error('Select at least one team and a shift'); return; }
      try {
        const result: any = await assignShift.mutateAsync({ team_ids: assignTeamIds, shift_id: assignForm.shift_id });
        toast.success(result?.message || 'Shift assigned to team(s)');
        closeAssignModal();
      } catch (e: any) { toast.error(e?.message || 'Failed to assign'); }
      return;
    }
    if (!assignForm.user_id || !assignForm.shift_id) { toast.error('Select user and shift'); return; }
    try {
      await assignShift.mutateAsync(assignForm);
      toast.success('Shift assigned');
      closeAssignModal();
    } catch (e: any) { toast.error(e?.message || 'Failed to assign'); }
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setAssignForm(EMPTY_ASSIGN_FORM);
    setAssignTeamIds([]);
    setAssignMode('employee');
  };

  return (
    <div className="flex flex-col gap-5 pb-10">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Attendance Management</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">Manage attendance, shifts, violations and reports.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={UserCheck} label="Present Today" value={noCheckinSummary.checked_in}
          subtitle={`of ${noCheckinSummary.total_employees} active employees`}
          iconBg="bg-green-50" iconColor="text-green-600"
        />
        <SummaryCard
          icon={Clock} label="Late Today" value={todayLateCount}
          subtitle="Checked in after grace period"
          iconBg="bg-amber-50" iconColor="text-amber-600"
        />
        <SummaryCard
          icon={Users} label="No Check-in Today" value={noCheckinSummary.not_checked_in}
          subtitle="No check-in, no approved leave"
          iconBg="bg-red-50" iconColor="text-red-600"
        />
      </div>

      <Tabs options={TABS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'Overview' && (
        <Card className="border-none shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => setActiveTab('No Check-in Today')}>View No Check-in Today</Button>
            <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => setActiveTab('Late Coming')}>View Late Coming</Button>
            <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => setActiveTab('Violations')}>View All Violations</Button>
            <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => setActiveTab('Shift Management')}>Manage Shifts</Button>
            <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => setActiveTab('Reports')}>Open Reports</Button>
          </div>
        </Card>
      )}

      {activeTab === 'Late Coming' && (
        <Card className="border-none shadow-sm">
          <h2 className="text-lg font-black text-gray-900 mb-3">Late Coming</h2>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button
              variant={lateQuickFilter === 'today' ? 'primary' : 'outline'}
              size="sm"
              className="rounded-xl h-9"
              onClick={() => applyLateQuickFilter('today')}
            >
              Today
            </Button>
            <Button
              variant={lateQuickFilter === 'week' ? 'primary' : 'outline'}
              size="sm"
              className="rounded-xl h-9"
              onClick={() => applyLateQuickFilter('week')}
            >
              This Week
            </Button>
            {(lateQuickFilter || lateDateRange.start_date || lateDateRange.end_date) && (
              <Button variant="ghost" size="sm" className="rounded-xl h-9 text-gray-500" onClick={clearLateDateFilter}>
                <X size={13} className="mr-1" /> Clear
              </Button>
            )}
          </div>
          <Table columns={lateCols} data={lateViolations} isLoading={lateLoading} emptyMessage="No late check-ins for this period." stickyHeader maxBodyHeight="520px" />
        </Card>
      )}

      {activeTab === 'No Check-in Today' && (
        <Card className="border-none shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">No Check-In Today</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Active employees with no check-in and no approved leave today.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={handleExportNoCheckinExcel}>
                <FileSpreadsheet size={14} className="mr-1.5" />
                Export Excel
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={handleExportNoCheckinCsv}>
                <FileText size={14} className="mr-1.5" />
                Export CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-xl h-9"
                loading={exportingPdf}
                onClick={handleExportNoCheckinPdf}
              >
                <FileDown size={14} className="mr-1.5" />
                Export PDF
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl h-9"
                loading={markAbsentees.isPending}
                disabled={noCheckins.length === 0}
                onClick={handleMarkAbsentees}
              >
                Add to Violations ({noCheckins.length})
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-2xl font-black text-primary-600">{noCheckinSummary.total_employees}</p>
              <p className="text-xs font-bold text-gray-500 mt-0.5">Total Employees</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-2xl font-black text-green-600">{noCheckinSummary.checked_in}</p>
              <p className="text-xs font-bold text-gray-500 mt-0.5">Checked In</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-2xl font-black text-red-600">{noCheckinSummary.not_checked_in}</p>
              <p className="text-xs font-bold text-gray-500 mt-0.5">Not Checked In</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-2xl font-black text-blue-600">{noCheckinSummary.on_leave ?? 0}</p>
              <p className="text-xs font-bold text-gray-500 mt-0.5">On Leave</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-2xl font-black text-amber-600">{noCheckinSummary.late ?? 0}</p>
              <p className="text-xs font-bold text-gray-500 mt-0.5">Late</p>
            </div>
          </div>

          {/* Business Unit -> Department -> Team -> Employee: each option
              list is backend-scoped to whichever parent(s) are already
              selected (useGetOrgFilterOptionsQuery), and changing a parent
              clears any now-invalid child selection. */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <SearchableSelect
              options={orgBusinessUnits.map((b) => ({ label: b.name, value: b.id }))}
              value={noCheckinBuFilter || null}
              onChange={(v) => setNoCheckinBuFilterAndClearChildren((v as string) ?? '')}
              placeholder="All Business Units"
              containerClassName="w-48"
              className="h-10"
            />
            <SearchableSelect
              options={orgDepartments.map((d) => ({ label: d.name, value: d.id }))}
              value={noCheckinDeptFilter || null}
              onChange={(v) => setNoCheckinDeptFilterAndClearChildren((v as string) ?? '')}
              placeholder="All Departments"
              containerClassName="w-44"
              className="h-10"
            />
            <SearchableSelect
              options={orgTeams.map((t) => ({ label: t.name, value: t.id }))}
              value={noCheckinTeamFilter || null}
              onChange={(v) => setNoCheckinTeamFilterAndClearChildren((v as string) ?? '')}
              placeholder="All Teams"
              containerClassName="w-44"
              className="h-10"
            />
            <SearchableSelect
              options={orgEmployees.map((e) => ({ label: e.name, value: e.id }))}
              value={noCheckinEmployeeFilter || null}
              onChange={(v) => setNoCheckinEmployeeFilter((v as string) ?? '')}
              placeholder="All Employees"
              containerClassName="w-48"
              className="h-10"
            />
            <SearchableSelect
              options={shifts.map((s: any) => ({ label: s.name, value: s.id }))}
              value={noCheckinShiftFilter || null}
              onChange={(v) => setNoCheckinShiftFilter((v as string) ?? '')}
              placeholder="All Shifts"
              containerClassName="w-40"
              className="h-10"
            />
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={noCheckinSearch}
                onChange={(e) => setNoCheckinSearch(e.target.value)}
                placeholder="Search employee by name, ID or email…"
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
              />
            </div>
            {noCheckinFiltersActive && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl h-9 text-gray-500"
                onClick={clearNoCheckinFilters}
              >
                <X size={13} className="mr-1" /> Clear Filters
              </Button>
            )}
          </div>
          <Table
            columns={[
              { header: 'Employee ID', key: 'employee_id', render: (item: any) => <span className="text-gray-500 font-mono text-xs">{item.employee_id || '—'}</span> },
              { header: 'Employee', key: 'first_name', render: (item: any) => (
                <div>
                  <span className="font-bold text-gray-900 block">{item.first_name} {item.last_name}</span>
                  <span className="text-gray-400 text-xs">{item.email}</span>
                </div>
              ) },
              { header: 'Department', key: 'department', render: (item: any) => <span className="text-gray-500">{item.department?.name || '—'}</span> },
              { header: 'Designation', key: 'designation', render: (item: any) => <span className="text-gray-500">{item.designation_ref?.name || item.designation || '—'}</span> },
              { header: 'Shift', key: 'shift', render: (item: any) => <span className="text-gray-500">{item.shift?.name || '—'}</span> },
              { header: 'Expected Check-in', key: 'expected', render: (item: any) => <span className="text-gray-500 font-mono text-xs">{item.shift?.start_time || '—'}</span> },
              { header: 'Reporting Manager', key: 'manager', render: (item: any) => <span className="text-gray-500">{item.supervisor ? `${item.supervisor.first_name} ${item.supervisor.last_name}` : '—'}</span> },
              { header: 'Actions', key: 'actions', render: (item: any) => (
                <IconButton
                  icon={Eye}
                  variant="ghost"
                  size="sm"
                  aria-label="View profile"
                  onClick={() => navigate(`/admin/profile/${item.id}`)}
                  className="!h-auto !w-auto p-1 text-gray-500 hover:text-primary-600"
                />
              ) },
            ]}
            data={noCheckins}
            isLoading={noCheckinsLoading}
            emptyMessage="Everyone active has checked in today."
            stickyHeader
            maxBodyHeight="560px"
          />
        </Card>
      )}

      {activeTab === 'Violations' && (
        <Card className="border-none shadow-sm">
          <h2 className="text-lg font-black text-gray-900 mb-4">Attendance Violations</h2>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <SearchableSelect
              options={users.map((u: any) => ({ label: `${u.first_name} ${u.last_name}`, value: u.id }))}
              value={violationFilters.user_id || null}
              onChange={(v) => setViolationFilters(p => ({ ...p, user_id: (v as string) ?? '' }))}
              placeholder="All Employees"
              containerClassName="sm:w-56"
              className="h-10"
            />
            <SearchableSelect
              options={[
                { label: 'Late', value: 'LATE' },
                { label: 'Absent', value: 'ABSENT' },
                { label: 'Early Out', value: 'EARLY_OUT' },
              ]}
              value={violationFilters.violation_type || null}
              onChange={(v) => setViolationFilters(p => ({ ...p, violation_type: (v as string) ?? '' }))}
              placeholder="All Types"
              containerClassName="sm:w-44"
              className="h-10"
            />
            <input
              type="date"
              value={violationFilters.start_date}
              onChange={(e) => setViolationFilters(p => ({ ...p, start_date: e.target.value }))}
              className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
            />
            <input
              type="date"
              value={violationFilters.end_date}
              onChange={(e) => setViolationFilters(p => ({ ...p, end_date: e.target.value }))}
              className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
            />
            {(violationFilters.start_date || violationFilters.end_date) && (
              <Button variant="ghost" size="sm" className="rounded-xl h-9 text-gray-500" onClick={clearDateFilter}>
                <X size={13} className="mr-1" /> Clear
              </Button>
            )}
          </div>
          <Table columns={violationCols} data={violations} isLoading={vLoading} emptyMessage="No violations recorded." stickyHeader maxBodyHeight="560px" />
        </Card>
      )}

      {activeTab === 'Shift Management' && (
        <Card className="border-none shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">Shift Configuration</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9" onClick={() => setShowAssignModal(true)}>
                <Clock size={14} /> Assign Shift
              </Button>
              <Button variant="primary" size="sm" className="rounded-xl gap-1.5 h-9" onClick={() => { setEditingShift(null); setShiftForm({ name: '', start_time: '09:00', end_time: '18:00', grace_period_min: 15, is_default: false }); setShowShiftModal(true); }}>
                <Plus size={14} /> New Shift
              </Button>
            </div>
          </div>
          <Table columns={shiftCols} data={shifts} isLoading={sLoading} emptyMessage="No shifts configured." />
        </Card>
      )}

      {activeTab === 'Reports' && <AttendanceReportsTab users={users} />}

      <Modal isOpen={showShiftModal} onClose={() => { setShowShiftModal(false); setEditingShift(null); }} title={editingShift ? 'Edit Shift' : 'New Shift'}>
        <form onSubmit={handleSaveShift} className="flex flex-col gap-4 mt-4">
          {[
            { label: 'Shift Name', key: 'name', type: 'text', placeholder: 'e.g. Morning Shift' },
            { label: 'Start Time', key: 'start_time', type: 'time' },
            { label: 'End Time', key: 'end_time', type: 'time' },
          ].map(({label, key, type, placeholder}) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{label}</label>
              <input type={type} value={(shiftForm as any)[key]} placeholder={placeholder}
                required={key === 'name'}
                onChange={(e) => setShiftForm(p => ({ ...p, [key]: e.target.value }))}
                className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none" />
            </div>
          ))}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Grace Period (minutes)</label>
            <input type="number" min="0" max="60" value={shiftForm.grace_period_min}
              onChange={(e) => setShiftForm(p => ({ ...p, grace_period_min: +e.target.value }))}
              className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={shiftForm.is_default}
              onChange={(e) => setShiftForm(p => ({ ...p, is_default: e.target.checked }))}
              className="w-4 h-4 rounded accent-primary-600" />
            <span className="text-sm font-bold text-gray-700">Set as default shift</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setShowShiftModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={upsertShift.isPending}>Save Shift</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showAssignModal} onClose={closeAssignModal} title="Assign Shift">
        <form onSubmit={handleAssign} className="flex flex-col gap-4 mt-4">
          <div className="flex gap-1.5 bg-gray-50 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setAssignMode('employee')}
              className={cn('px-3 h-8 rounded-lg text-xs font-semibold transition-colors', assignMode === 'employee' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
            >
              Single Employee
            </button>
            <button
              type="button"
              onClick={() => setAssignMode('team')}
              className={cn('px-3 h-8 rounded-lg text-xs font-semibold transition-colors', assignMode === 'team' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
            >
              Whole Team(s)
            </button>
          </div>

          {assignMode === 'employee' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Employee</label>
              <SearchableSelect
                options={users.map((u: any) => ({ label: `${u.first_name} ${u.last_name}`, value: u.id }))}
                value={assignForm.user_id || null}
                onChange={(v) => setAssignForm(p => ({ ...p, user_id: (v as string) ?? '' }))}
                placeholder="Select employee"
                className="h-11"
              />
            </div>
          ) : (
            <ChipMultiSelect
              label="Teams"
              options={teams.map((t: any) => ({ id: t.id, label: t.name }))}
              selected={assignTeamIds}
              onChange={setAssignTeamIds}
              emptyText="No teams available"
            />
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Shift</label>
            <SearchableSelect
              options={shifts.map((s: any) => ({ label: `${s.name} (${s.start_time}–${s.end_time})`, value: s.id }))}
              value={assignForm.shift_id || null}
              onChange={(v) => setAssignForm(p => ({ ...p, shift_id: (v as string) ?? '' }))}
              placeholder="Select shift"
              className="h-11"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" fullWidth onClick={closeAssignModal}>Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={assignShift.isPending}>Assign</Button>
          </div>
        </form>
      </Modal>

      <ActionModal
        isOpen={!!shiftToDelete}
        onClose={() => setShiftToDelete(null)}
        onConfirm={confirmDeleteShift}
        title="Delete Shift"
        description={`Are you sure you want to delete shift "${shiftToDelete?.name}"?`}
        confirmText="Delete"
        confirmVariant="danger"
        icon="delete"
        loading={deleteShift.isPending}
      />
    </div>
  );
};

export default AttendancePage;
