import React, { useMemo, useState } from 'react';
import { Users2, UserCheck, UserX, CalendarClock, AlarmClock, Search } from 'lucide-react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import SearchableSelect from '@/components/ui/SearchableSelect';
import StatusBadge from '@/components/ui/StatusBadge';
import { KpiRow } from './components/KpiRow';
import { TrendChart } from './components/TrendChart';
import { BreakdownList } from './components/BreakdownList';
import { ExportMenu } from './components/ExportMenu';
import { DEPARTMENTS, generateAttendanceRows, generateAttendanceTrend, type AttendanceRow } from './mockData';

const PERIOD_OPTIONS = [
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 14 Days', value: '14' },
  { label: 'Last 30 Days', value: '30' },
];

const PAGE_SIZE = 8;

const ALL_ROWS = generateAttendanceRows(60);

export const AttendanceReport: React.FC = () => {
  const [period, setPeriod] = useState('14');
  const [department, setDepartment] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const trend = useMemo(() => generateAttendanceTrend(Number(period)), [period]);

  const filteredRows = useMemo(() => {
    return ALL_ROWS.filter((r) => {
      if (department && r.department !== department) return false;
      if (status && r.status !== status) return false;
      if (search && !r.employee.toLowerCase().includes(search.toLowerCase()) && !r.employeeId.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [department, status, search]);

  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(() => {
    const present = ALL_ROWS.filter((r) => r.status === 'Present').length;
    const absent = ALL_ROWS.filter((r) => r.status === 'Absent').length;
    const onLeave = ALL_ROWS.filter((r) => r.status === 'On Leave').length;
    const late = ALL_ROWS.filter((r) => r.status === 'Late').length;
    return { total: ALL_ROWS.length, present, absent, onLeave, late };
  }, []);

  const deptBreakdown = useMemo(() => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500'];
    return DEPARTMENTS.map((dept, i) => ({
      label: dept,
      count: ALL_ROWS.filter((r) => r.department === dept && (r.status === 'Present' || r.status === 'Late')).length,
      color: colors[i % colors.length],
    })).sort((a, b) => b.count - a.count);
  }, []);

  const columns: Column<AttendanceRow>[] = [
    {
      header: 'Employee',
      key: 'employee',
      render: (r) => (
        <div>
          <p className="font-semibold text-gray-900">{r.employee}</p>
          <p className="text-xs text-gray-400">{r.employeeId}</p>
        </div>
      ),
    },
    { header: 'Department', key: 'department' },
    { header: 'Check In', key: 'checkIn', render: (r) => r.checkIn ?? '—' },
    { header: 'Check Out', key: 'checkOut', render: (r) => r.checkOut ?? '—' },
    { header: 'Work Hours', key: 'workHours', render: (r) => r.workHours ?? '—' },
    { header: 'Status', key: 'status', render: (r) => <StatusBadge status={r.status} size="sm" /> },
    { header: 'Late (mins)', key: 'lateMins', align: 'right', render: (r) => (r.lateMins != null ? r.lateMins : '—') },
  ];

  return (
    <div className="flex flex-col gap-5">
      <KpiRow
        cards={[
          { icon: Users2, color: 'bg-blue-500', label: 'Total Employees', value: totals.total, subtext: 'Active employees' },
          { icon: UserCheck, color: 'bg-green-500', label: 'Present', value: totals.present, subtext: `${Math.round((totals.present / totals.total) * 100)}% of total` },
          { icon: UserX, color: 'bg-red-500', label: 'Absent', value: totals.absent, subtext: `${Math.round((totals.absent / totals.total) * 100)}% of total` },
          { icon: CalendarClock, color: 'bg-amber-500', label: 'On Leave', value: totals.onLeave, subtext: `${Math.round((totals.onLeave / totals.total) * 100)}% of total` },
          { icon: AlarmClock, color: 'bg-purple-500', label: 'Late Arrivals', value: totals.late, subtext: 'This period' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Attendance Overview</p>
            <div className="w-40">
              <SearchableSelect options={PERIOD_OPTIONS} value={period} onChange={(v) => setPeriod(String(v))} />
            </div>
          </div>
          <TrendChart
            data={trend}
            xKey="date"
            series={[
              { key: 'present', label: 'Present', color: '#22C55E' },
              { key: 'absent', label: 'Absent', color: '#EF4444' },
              { key: 'onLeave', label: 'On Leave', color: '#F59E0B' },
              { key: 'late', label: 'Late', color: '#8B5CF6' },
            ]}
          />
        </Card>

        <Card className="border-none shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Attendance by Department</p>
          <BreakdownList items={deptBreakdown} />
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Attendance Details</p>
          <ExportMenu
            rows={filteredRows}
            filenamePrefix="Attendance_Report"
            columns={[
              { key: 'employee', label: 'Employee' },
              { key: 'employeeId', label: 'Employee ID' },
              { key: 'department', label: 'Department' },
              { key: 'checkIn', label: 'Check In' },
              { key: 'checkOut', label: 'Check Out' },
              { key: 'workHours', label: 'Work Hours' },
              { key: 'status', label: 'Status' },
              { key: 'lateMins', label: 'Late (mins)' },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search employee…"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
            />
          </div>
          <div className="w-44">
            <SearchableSelect
              options={DEPARTMENTS.map((d) => ({ label: d, value: d }))}
              value={department}
              onChange={(v) => { setDepartment(v ? String(v) : ''); setPage(1); }}
              placeholder="All Departments"
              clearable
            />
          </div>
          <div className="w-44">
            <SearchableSelect
              options={['Present', 'Absent', 'On Leave', 'Late'].map((s) => ({ label: s, value: s }))}
              value={status}
              onChange={(v) => { setStatus(v ? String(v) : ''); setPage(1); }}
              placeholder="All Statuses"
              clearable
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={pageRows}
          emptyMessage="No attendance records match your filters."
          pagination={{
            currentPage: page,
            totalPages: Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE)),
            onPageChange: setPage,
            totalEntries: filteredRows.length,
            entriesPerPage: PAGE_SIZE,
          }}
        />
      </Card>
    </div>
  );
};

export default AttendanceReport;
