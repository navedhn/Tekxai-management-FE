import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Download, BarChart3, Users, Clock, TrendingUp } from 'lucide-react';
import { useAttendanceReport, useLeaveReport, usePerformanceReport, useProjectsReport, download_report } from '@/services/reportService';
import { useFetchUsersQuery } from '@/services/userService';

const TABS = ['Attendance', 'Leave', 'Performance', 'Projects'];

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Attendance');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [period, setPeriod] = useState('June 2026');
  const [selectedUser, setSelectedUser] = useState('');

  const { data: users = [] } = useFetchUsersQuery({});
  const userOptions = [
    { value: '', label: 'All Employees' },
    ...(users as any[]).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` })),
  ];

  const buildParams = (extra?: Record<string, string>) => {
    const p: Record<string, string> = {};
    if (dateRange.from) { p.from = dateRange.from; p.to = dateRange.to; }
    if (selectedUser) p.user_id = selectedUser;
    return { ...p, ...extra };
  };

  const params = Object.keys(buildParams()).length ? buildParams() : undefined;
  const { data: attendance = [], isLoading: attLoading } = useAttendanceReport(params);
  const { data: leave = [], isLoading: leaveLoading } = useLeaveReport(params);
  const { data: performance = [], isLoading: perfLoading } = usePerformanceReport(buildParams({ period }));
  const { data: projects = [], isLoading: projLoading } = useProjectsReport();

  const attendanceCols: Column<any>[] = [
    { header: 'Employee', key: 'employee', render: (r) => <span className="font-bold">{r.employee}</span> },
    { header: 'Date', key: 'date', render: (r) => <span>{r.date}</span> },
    { header: 'Check In', key: 'check_in' },
    { header: 'Check Out', key: 'check_out' },
    { header: 'Hours', key: 'hours', render: (r) => <span className="font-bold text-primary-600">{r.hours}</span> },
    { header: 'Status', key: 'status' },
  ];

  const leaveCols: Column<any>[] = [
    { header: 'Employee', key: 'employee', render: (r) => <span className="font-bold">{r.employee}</span> },
    { header: 'Policy', key: 'policy' },
    { header: 'From', key: 'from_date' },
    { header: 'To', key: 'to_date' },
    { header: 'Days', key: 'days', render: (r) => <span className="font-bold">{r.days}</span> },
    { header: 'Status', key: 'status' },
  ];

  const performanceCols: Column<any>[] = [
    { header: 'Employee', key: 'employee', render: (r) => <span className="font-bold">{r.employee}</span> },
    { header: 'Period', key: 'period' },
    { header: 'Total Score', key: 'total', render: (r) => <span className="font-black text-lg text-primary-600">{r.total}</span> },
    { header: 'Delivery', key: 'timely_delivery' },
    { header: 'Quality', key: 'quality' },
    { header: 'Regularity', key: 'regularity' },
  ];

  const projectCols: Column<any>[] = [
    { header: 'Project', key: 'title', render: (r) => <span className="font-bold">{r.title}</span> },
    { header: 'Status', key: 'status' },
    { header: 'Progress', key: 'progress', render: (r) => (
      <div className="flex items-center gap-2 w-28">
        <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full" style={{ width: r.progress }} />
        </div>
        <span className="text-xs font-bold">{r.progress}</span>
      </div>
    )},
    { header: 'Members', key: 'members' },
    { header: 'Due Date', key: 'end_date' },
  ];

  const handleExport = () => {
    const type = activeTab.toLowerCase();
    const p = buildParams();
    if (activeTab === 'Performance') p.period = period;
    if (!p.from && dateRange.from) { p.from = dateRange.from; p.to = dateRange.to || new Date().toISOString().split('T')[0]; }
    download_report(type === 'attendance' ? 'attendance' : type === 'leave' ? 'leave' : type === 'performance' ? 'performance' : 'projects', { ...p, format: 'csv' });
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Export attendance, leave, performance, and project reports.</p>
        </div>
        <Button variant="primary" className="rounded-xl gap-2 h-10 px-5 font-black" onClick={handleExport}>
          <Download size={16} /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-52">
          <Select
            options={userOptions}
            value={selectedUser}
            onChange={(v) => setSelectedUser(v as string)}
            className="h-9 !rounded-xl text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500">FROM</label>
          <input type="date" value={dateRange.from} onChange={(e) => setDateRange(p => ({ ...p, from: e.target.value }))}
            className="h-9 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-100 outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500">TO</label>
          <input type="date" value={dateRange.to} onChange={(e) => setDateRange(p => ({ ...p, to: e.target.value }))}
            className="h-9 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-100 outline-none" />
        </div>
        {activeTab === 'Performance' && (
          <div className="w-36">
            <Select options={[{ value: 'June 2026', label: 'Jun 2026' }, { value: 'May 2026', label: 'May 2026' }]}
              value={period} onChange={(v) => setPeriod(v as string)} className="h-9 !rounded-xl text-xs" />
          </div>
        )}
      </div>

      <Tabs options={TABS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'Attendance' && (
        <Card className="border-none shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-4">Total records: <strong>{attendance.length}</strong></p>
          <Table columns={attendanceCols} data={attendance} isLoading={attLoading} emptyMessage="No attendance records found." />
        </Card>
      )}
      {activeTab === 'Leave' && (
        <Card className="border-none shadow-sm">
          <Table columns={leaveCols} data={leave} isLoading={leaveLoading} emptyMessage="No leave records." />
        </Card>
      )}
      {activeTab === 'Performance' && (
        <Card className="border-none shadow-sm">
          <Table columns={performanceCols} data={performance} isLoading={perfLoading} emptyMessage="No performance data." />
        </Card>
      )}
      {activeTab === 'Projects' && (
        <Card className="border-none shadow-sm">
          <Table columns={projectCols} data={projects} isLoading={projLoading} emptyMessage="No project data." />
        </Card>
      )}
    </div>
  );
};

export default ReportsPage;
