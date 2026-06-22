import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Tabs from '@/components/ui/Tabs';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { Clock, AlertTriangle, Settings, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useGetShiftsQuery, useGetViolationsQuery, useUpsertShiftMutation, useAssignShiftMutation } from '@/services/attendanceService';
import { useFetchUsersQuery } from '@/services/userService';

const TABS = ['Late Coming / Violations', 'Shift Management'];

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
  const [shiftForm, setShiftForm] = useState({ name: '', start_time: '09:00', end_time: '18:00', grace_period_min: 15, is_default: false });
  const [assignForm, setAssignForm] = useState({ user_id: '', shift_id: '' });

  const { data: violationsData, isLoading: vLoading } = useGetViolationsQuery();
  const { data: shifts = [], isLoading: sLoading } = useGetShiftsQuery();
  const { data: users = [] } = useFetchUsersQuery({});
  const upsertShift = useUpsertShiftMutation();
  const assignShift = useAssignShiftMutation();

  const violations = (violationsData as any)?.records || [];

  const violationCols: Column<any>[] = [
    { header: 'Employee', key: 'user_id', render: (item) => <span className="font-bold">{item.user?.first_name} {item.user?.last_name}</span> },
    { header: 'Date', key: 'date', render: (item) => new Date(item.date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) },
    { header: 'Expected', key: 'expected_check_in', render: (item) => item.expected_check_in ? new Date(item.expected_check_in).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }) : '—' },
    { header: 'Actual', key: 'actual_check_in', render: (item) => item.actual_check_in ? new Date(item.actual_check_in).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }) : '—' },
    { header: 'Late (mins)', key: 'late_minutes', render: (item) => <span className="font-black text-red-500">{item.late_minutes || 0}</span> },
    { header: 'Type', key: 'violation_type', render: (item) => (
      <Badge variant="info" className={cn('text-[10px] font-bold border rounded-lg px-2 py-0.5', VIOLATION_COLORS[item.violation_type] || '')}>
        {item.violation_type}
      </Badge>
    )},
    { header: 'Excused', key: 'is_excused', render: (item) => item.is_excused ? <span className="text-green-500 font-bold text-xs">Yes</span> : <span className="text-gray-300 text-xs">No</span> },
  ];

  const shiftCols: Column<any>[] = [
    { header: 'Shift Name', key: 'name', render: (item) => <span className="font-black">{item.name}</span> },
    { header: 'Start', key: 'start_time', render: (item) => <span className="font-mono">{item.start_time}</span> },
    { header: 'End', key: 'end_time', render: (item) => <span className="font-mono">{item.end_time}</span> },
    { header: 'Grace Period', key: 'grace_period_min', render: (item) => <span>{item.grace_period_min} min</span> },
    { header: 'Default', key: 'is_default', render: (item) => item.is_default ? <Badge variant="success" className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded-lg">Default</Badge> : null },
  ];

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertShift.mutateAsync(shiftForm);
      toast.success('Shift saved');
      setShowShiftModal(false);
    } catch { toast.error('Failed to save shift'); }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.user_id || !assignForm.shift_id) { toast.error('Select user and shift'); return; }
    try {
      await assignShift.mutateAsync(assignForm);
      toast.success('Shift assigned');
      setShowAssignModal(false);
    } catch { toast.error('Failed to assign'); }
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
              <Button variant="primary" size="sm" className="rounded-xl gap-1.5 h-9" onClick={() => setShowShiftModal(true)}>
                <Plus size={14} /> New Shift
              </Button>
            </div>
          </div>
          <Table columns={shiftCols} data={shifts} isLoading={sLoading} emptyMessage="No shifts configured." />
        </Card>
      )}

      {/* New Shift Modal */}
      <Modal isOpen={showShiftModal} onClose={() => setShowShiftModal(false)} title="Configure Shift">
        <form onSubmit={handleSaveShift} className="flex flex-col gap-4 mt-4">
          {[
            { label: 'Shift Name', key: 'name', type: 'text', placeholder: 'e.g. Morning Shift' },
            { label: 'Start Time', key: 'start_time', type: 'time' },
            { label: 'End Time', key: 'end_time', type: 'time' },
          ].map(({label, key, type, placeholder}) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{label}</label>
              <input type={type} value={(shiftForm as any)[key]} placeholder={placeholder}
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
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Shift to Employee">
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
            <Button type="button" variant="outline" fullWidth onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={assignShift.isPending}>Assign</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendancePage;
