import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Tabs from '@/components/ui/Tabs';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import ActionModal from '@/components/ui/ActionModal';
import { Clock, AlertTriangle, Settings, Plus, Pencil, Trash2, BarChart3 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useGetShiftsQuery, useGetViolationsQuery, useUpsertShiftMutation, useAssignShiftMutation, useDeleteShiftMutation } from '@/services/attendanceService';
import { useFetchUsersQuery } from '@/services/userService';
import { apiRequest } from '@/lib/queryClient';

const TABS = ['Late Coming / Violations', 'Shift Management', 'Reports'];
const v1 = 'api/v1';
const BUILDER = `${v1}/report/builder`;

// Sprint 1 Milestone 5 — Attendance Reports, entirely via the generic
// report_builder engine against the already-persisted attendance_violations/
// timesheet_entries/employee_shifts tables (no new attendance-specific logic).
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

const VIOLATION_COLORS: Record<string, string> = {
  LATE:      'bg-yellow-50 text-yellow-700 border-yellow-100',
  ABSENT:    'bg-red-50 text-red-700 border-red-100',
  EARLY_OUT: 'bg-orange-50 text-orange-700 border-orange-100',
};

const AttendancePage: React.FC = () => {
  const toast = useToastContext();
  const [activeTab, setActiveTab] = useState('Late Coming / Violations');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [shiftToDelete, setShiftToDelete] = useState<any>(null);
  const [shiftForm, setShiftForm] = useState({ name: '', start_time: '09:00', end_time: '18:00', grace_period_min: 15, is_default: false });
  const EMPTY_ASSIGN_FORM = { user_id: '', shift_id: '' };
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN_FORM);
  const [violationFilters, setViolationFilters] = useState({ user_id: '', violation_type: '', start_date: '', end_date: '' });

  const { data: violationsData, isLoading: vLoading } = useGetViolationsQuery(violationFilters);
  const { data: shifts = [], isLoading: sLoading } = useGetShiftsQuery();
  const { data: users = [] } = useFetchUsersQuery({});
  const upsertShift = useUpsertShiftMutation();
  const assignShift = useAssignShiftMutation();
  const deleteShift = useDeleteShiftMutation();

  const violations = (violationsData as any)?.records || [];

  const violationCols: Column<any>[] = [
    { header: 'Employee', key: 'user_id', render: (item) => <span className="font-bold">{item.user?.first_name} {item.user?.last_name}</span> },
    { header: 'Date', key: 'date', render: (item) => new Date(item.date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) },
    { header: 'Late (mins)', key: 'late_mins', render: (item) => <span className="font-black text-red-500">{item.late_mins || 0}</span> },
    { header: 'Type', key: 'violation_type', render: (item) => (
      <Badge variant="info" className={cn('text-[10px] font-bold border rounded-lg px-2 py-0.5', VIOLATION_COLORS[item.violation_type] || '')}>
        {item.violation_type}
      </Badge>
    )},
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
        <button onClick={() => openEditShift(item)} className="cursor-pointer text-gray-500 hover:text-primary-600 transition-colors p-1 rounded"><Pencil size={14} /></button>
        <button onClick={() => handleDeleteShift(item)} className="cursor-pointer text-gray-500 hover:text-red-500 transition-colors p-1 rounded"><Trash2 size={14} /></button>
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
    if (!assignForm.user_id || !assignForm.shift_id) { toast.error('Select user and shift'); return; }
    try {
      await assignShift.mutateAsync(assignForm);
      toast.success('Shift assigned');
      setShowAssignModal(false);
      setAssignForm(EMPTY_ASSIGN_FORM);
    } catch (e: any) { toast.error(e?.message || 'Failed to assign'); }
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setAssignForm(EMPTY_ASSIGN_FORM);
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Attendance Management</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">Manage shifts, late coming, grace periods and violations.</p>
      </div>

      <Tabs options={TABS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'Late Coming / Violations' && (
        <Card className="border-none shadow-sm">
          <h2 className="text-lg font-black text-gray-900 mb-4">Attendance Violations</h2>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select
              value={violationFilters.user_id}
              onChange={(e) => setViolationFilters(p => ({ ...p, user_id: e.target.value }))}
              className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none sm:w-56"
            >
              <option value="">All Employees</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
            <select
              value={violationFilters.violation_type}
              onChange={(e) => setViolationFilters(p => ({ ...p, violation_type: e.target.value }))}
              className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none sm:w-44"
            >
              <option value="">All Types</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
              <option value="EARLY_OUT">Early Out</option>
            </select>
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
          </div>
          <Table columns={violationCols} data={violations} isLoading={vLoading} emptyMessage="No violations recorded." />
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

      {/* New/Edit Shift Modal */}
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

      {/* Assign Shift Modal */}
      <Modal isOpen={showAssignModal} onClose={closeAssignModal} title="Assign Shift to Employee">
        <form onSubmit={handleAssign} className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Employee</label>
            <select value={assignForm.user_id} onChange={(e) => setAssignForm(p => ({ ...p, user_id: e.target.value }))}
              className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none">
              <option value="">Select employee</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Shift</label>
            <select value={assignForm.shift_id} onChange={(e) => setAssignForm(p => ({ ...p, shift_id: e.target.value }))}
              className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none">
              <option value="">Select shift</option>
              {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</option>)}
            </select>
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
