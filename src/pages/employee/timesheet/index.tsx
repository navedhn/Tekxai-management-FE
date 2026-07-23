import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button, { pageActionButtonClass } from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import { ChevronLeft, ChevronRight, Calendar, MoreVertical } from 'lucide-react';
import { cn } from '@/utils/cn';
import RequestTimeOffModal from '@/components/ui/RequestTimeOffModal';
import { useGetTimeOffRequests, useGetWeeklyTimesheet, TimesheetEntry } from '@/services/timesheetService';
import { useGetMyShiftQuery, useGetMyAttendanceSummary } from '@/services/attendanceService';
import { CardSkeleton } from '@/components/skeletons';

// ── Date helpers ─────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  // Not `.toISOString().split('T')[0]` — that converts to UTC first, which
  // silently shifts the date back a day for any positive-UTC-offset
  // timezone (e.g. Asia/Karachi, UTC+5) whenever `d` is local midnight, as
  // every date here is (see startOfWeek/startOfMonth below).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date) {
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Mon
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function fmtLabel(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' });
}

function fmtMonthYear(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function fmtWeekRange(start: Date) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${fmtLabel(start)} – ${fmtLabel(end)}`;
}

// ── Status badge styles ───────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  'In Progress': 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
  'Overdue':     'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]',
  'Pending':     'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]',
  'Completed':   'bg-[#EFF8FF] text-[#005CDA] border-[#D1E9FF]',
};

// ── Main component ────────────────────────────────────────────────────────────

const VIEW_TABS = ['Weekly', 'Monthly', 'Custom', 'My Requests'];

const EmployeeTimesheet: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Weekly');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Week navigation
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));

  // Month navigation
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));

  // Custom date range
  const [customFrom, setCustomFrom] = useState(toDateStr(startOfWeek(new Date())));
  const [customTo, setCustomTo]     = useState(toDateStr(new Date()));
  const [customApplied, setCustomApplied] = useState({ from: customFrom, to: customTo });

  // Derive the `date` query param the backend needs (week start date)
  const queryDate = (() => {
    if (activeTab === 'Weekly')  return toDateStr(weekAnchor);
    if (activeTab === 'Monthly') return toDateStr(monthAnchor);
    if (activeTab === 'Custom')  return customApplied.from;
    return undefined;
  })();

  const isTimesheetTab = activeTab !== 'My Requests';
  const { data: timesheet, isLoading } = useGetWeeklyTimesheet(
    queryDate ? { date: queryDate } : undefined,
    isTimesheetTab
  );
  const { data: timeOffRequests, isLoading: isLoadingRequests } = useGetTimeOffRequests(
    activeTab === 'My Requests'
  );

  const { data: myShift } = useGetMyShiftQuery();
  const { data: mySummary } = useGetMyAttendanceSummary();

  // For monthly: accumulate multiple weeks
  const monthWeeks = (() => {
    if (activeTab !== 'Monthly') return null;
    const weeks: Date[] = [];
    const cur = new Date(monthAnchor);
    while (cur.getMonth() === monthAnchor.getMonth()) {
      weeks.push(startOfWeek(new Date(cur)));
      cur.setDate(cur.getDate() + 7);
    }
    return [...new Set(weeks.map(toDateStr))];
  })();

  const columns: Column<TimesheetEntry>[] = [
    {
      header: 'Day', key: 'day_date',
      render: (item) => <span className="font-bold text-gray-900">{item.day_label || fmtLabel(new Date(item.day_date))}</span>,
    },
    {
      header: 'Check In', key: 'check_in',
      render: (item) => <span className={!item.has_entry ? 'text-gray-400' : ''}>{item.check_in || item.no_entry_text}</span>,
    },
    {
      header: 'Check Out', key: 'check_out',
      render: (item) => <span className={!item.has_entry ? 'text-gray-400' : ''}>{item.check_out || item.no_entry_text}</span>,
    },
    { header: 'Duration', key: 'duration_label', render: (item) => <span>{item.duration_label}</span> },
    {
      header: 'Status', key: 'status',
      render: (item) => {
        if (!item.has_entry && !item.status) return null;
        const style = item.status_label ? STATUS_STYLES[item.status_label] || '' : '';
        return (
          <Badge variant="info" className={cn('rounded-lg px-2 py-0.5 text-[10px] font-bold border', style)}>
            {item.status_label || item.status}
          </Badge>
        );
      },
    },
    {
      header: '', key: 'actions',
      render: () => (
        <div className="flex justify-end">
          <button className="p-1.5 hover:bg-gray-50 text-gray-400 hover:text-gray-600 rounded-lg">
            <MoreVertical size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <RequestTimeOffModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Timesheet</h1>
          <p className="text-sm text-gray-400 font-bold">View and manage your time entries</p>
        </div>
      </div>

      {/* My Shift + This Month's Summary */}
      <Card className="flex flex-wrap items-center gap-8 shadow-xl border-none bg-white">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">My Shift</span>
          <span className="text-sm font-black text-gray-900">
            {myShift ? `${myShift.name} · ${myShift.start_time}–${myShift.end_time}` : 'No shift assigned'}
          </span>
        </div>
        <div className="h-8 w-px bg-gray-100" />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Working Days (This Month)</span>
          <span className="text-sm font-black text-gray-900">{mySummary?.total_working_days ?? '—'}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Late Count</span>
          <span className="text-sm font-black text-gray-900">{mySummary?.late_count ?? '—'}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total Late Minutes</span>
          <span className="text-sm font-black text-gray-900">{mySummary?.total_late_minutes ?? '—'}</span>
        </div>
      </Card>

      <Tabs options={VIEW_TABS} value={activeTab} onChange={setActiveTab} />

      {/* ── Weekly View ── */}
      {activeTab === 'Weekly' && (
        <Card className="flex flex-col gap-4 shadow-xl border-none p-0 overflow-hidden bg-white">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="text-xl font-black text-gray-900">{fmtWeekRange(weekAnchor)}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setWeekAnchor(startOfWeek(new Date()))}
                className="px-3 h-8 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                This Week
              </button>
              <button
                onClick={() => setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="px-4 pb-2 text-sm text-gray-500 font-semibold">
            Total: <span className="text-gray-900 font-black">{timesheet?.total_duration_label || '0h 0m'}</span>
          </div>
          <div className="px-4 pb-4">
            <Table columns={columns} data={timesheet?.rows || []} isLoading={isLoading}
              className="border-none shadow-none" headerClassName="bg-[#F0F5FF]/50 border-none rounded-xl" />
          </div>
        </Card>
      )}

      {/* ── Monthly View ── */}
      {activeTab === 'Monthly' && (
        <Card className="flex flex-col gap-4 shadow-xl border-none p-0 overflow-hidden bg-white">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="text-xl font-black text-gray-900">{fmtMonthYear(monthAnchor)}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonthAnchor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setMonthAnchor(startOfMonth(new Date()))}
                className="px-3 h-8 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                This Month
              </button>
              <button
                onClick={() => setMonthAnchor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          {/* Render one week-block per week in the month */}
          <MonthlyWeeks monthAnchor={monthAnchor} columns={columns} />
        </Card>
      )}

      {/* ── Custom Date Range ── */}
      {activeTab === 'Custom' && (
        <Card className="flex flex-col gap-4 shadow-xl border-none p-0 overflow-hidden bg-white">
          <div className="flex flex-wrap items-end gap-3 px-4 pt-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">From</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">To</label>
              <input type="date" value={customTo} min={customFrom} onChange={e => setCustomTo(e.target.value)}
                className="h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
            </div>
            <Button variant="primary" className="h-10 px-5 rounded-xl"
              onClick={() => setCustomApplied({ from: customFrom, to: customTo })}>
              Apply
            </Button>
          </div>
          <div className="px-4 pb-2 text-sm text-gray-500 font-semibold">
            {customApplied.from} → {customApplied.to} &nbsp;·&nbsp; Total:{' '}
            <span className="text-gray-900 font-black">{timesheet?.total_duration_label || '0h 0m'}</span>
          </div>
          <div className="px-4 pb-4">
            <Table columns={columns} data={timesheet?.rows || []} isLoading={isLoading}
              className="border-none shadow-none" headerClassName="bg-[#F0F5FF]/50 border-none rounded-xl" />
          </div>
        </Card>
      )}

      {/* ── My Requests ── */}
      {activeTab === 'My Requests' && (
        <div className="flex flex-col gap-8 bg-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">My Requests</h2>
            <Button variant="primary" size="sm" rounded={false} leftIcon={Calendar}
              onClick={() => setIsRequestModalOpen(true)} className={pageActionButtonClass}>
              Request Time Off
            </Button>
          </div>

          <div className="flex flex-col gap-6">
            <h3 className="text-lg font-black text-gray-900">Time Off Requests</h3>
            {isLoadingRequests ? (
              Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)
            ) : timeOffRequests?.time_off_requests?.length ? timeOffRequests.time_off_requests.map((req: any) => (
              <Card key={req.id} className="p-6 flex flex-col gap-4 bg-white border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{req.policy_name || 'Leave Request'}</h3>
                      <Badge variant={req.status === 'REJECTED' ? 'error' : 'success'}
                        className={cn('px-2 py-0.5 text-[10px] font-bold rounded-lg',
                          req.status === 'REJECTED' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-green-50 text-green-500 border-green-100')}>
                        {req.status_label || req.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-400 font-bold">{req.date_range_label}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-base font-black text-gray-900">{req.days ? `${req.days} days` : 'N/A'}</span>
                    <span className="text-base text-gray-400 font-bold">{req.total_hours_label || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                    <p className="text-[14px] font-bold text-gray-400">Reason: <span className="font-medium text-gray-600">{req.reason}</span></p>
                  </div>
                  {req.manager_comment && (
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <p className="text-[14px] font-bold text-gray-400">Manager comment: <span className="font-medium text-gray-600">{req.manager_comment}</span></p>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-gray-400">{req.submitted_at_label}</span>
              </Card>
            )) : <p className="text-xs text-gray-400 font-bold mt-2">No time off requests found.</p>}

            <div className="mt-4">
              <h3 className="text-lg font-black text-gray-900">Timesheet Edit Requests</h3>
              {isLoadingRequests ? <CardSkeleton /> :
                timeOffRequests?.timesheet_edit_requests?.length ? timeOffRequests.timesheet_edit_requests.map((req: any) => (
                  <Card key={req.id} className="p-6 flex flex-col gap-4 mt-4 border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-900">{req.name || 'Edit Request'}</h3>
                    <p className="text-[14px] text-gray-400">{req.reason}</p>
                    <Badge variant="info" className={cn('!w-max px-2 py-0.5 text-[10px] font-bold rounded-lg border',
                      req.status === 'Pending' ? 'bg-orange-50 text-orange-500 border-orange-100' : 'bg-gray-50 text-gray-500')}>
                      {req.status}
                    </Badge>
                  </Card>
                )) : <p className="text-xs text-gray-400 italic mt-2">No edit requests found.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Monthly sub-component: renders each week of the month ─────────────────────

const MonthlyWeeks: React.FC<{ monthAnchor: Date; columns: Column<TimesheetEntry>[] }> = ({ monthAnchor, columns }) => {
  // Collect unique week-start dates that fall within the month
  const weeks: Date[] = [];
  const cur = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const seen = new Set<string>();
  while (cur.getMonth() === monthAnchor.getMonth()) {
    const ws = startOfWeek(new Date(cur));
    const key = toDateStr(ws);
    if (!seen.has(key)) { seen.add(key); weeks.push(ws); }
    cur.setDate(cur.getDate() + 7);
  }

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {weeks.map((ws) => (
        <WeekBlock key={toDateStr(ws)} weekStart={ws} columns={columns} />
      ))}
    </div>
  );
};

const WeekBlock: React.FC<{ weekStart: Date; columns: Column<TimesheetEntry>[] }> = ({ weekStart, columns }) => {
  const { data: timesheet, isLoading } = useGetWeeklyTimesheet({ date: toDateStr(weekStart) }, true);
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-black text-gray-700">{fmtWeekRange(weekStart)}</span>
        <span className="text-xs text-gray-400 font-semibold">{timesheet?.total_duration_label || '—'}</span>
      </div>
      <Table columns={columns} data={timesheet?.rows || []} isLoading={isLoading}
        className="border-none shadow-none text-sm" headerClassName="bg-[#F0F5FF]/50 rounded-lg" />
    </div>
  );
};

export default EmployeeTimesheet;
