import React, { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button, { PageActionButton } from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { ChevronLeft, ChevronRight, Calendar, MoreVertical, Clock, Coffee, Timer, BarChart3, Briefcase } from 'lucide-react';
import { cn } from '@/utils/cn';
import RequestTimeOffModal from '@/components/ui/RequestTimeOffModal';
import { useGetTimeOffRequests, useGetWeeklyTimesheet, useGetRangeTimesheet, useRequestEntryEditMutation, useSubmitClientApprovalMutation, TimesheetEntry, WeeklyTimesheetData } from '@/services/timesheetService';
import { useGetMyShiftQuery, useGetMyAttendanceSummary } from '@/services/attendanceService';
import { CardSkeleton, PageSkeleton, TableSkeleton } from '@/components/skeletons';
import { useShowPageSkeleton } from '@/hooks/useShowPageSkeleton';
import { useToastContext } from '@/components/toast/ToastProvider';
import DashboardStatCard from '@/components/ui/DashboardStatCard';

function toDateStr(d: Date) {

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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

function fmtRequestDateRange(startIso?: string, endIso?: string) {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${fmtLabel(start)} – ${fmtLabel(end)}`;
}

// Frontend never computes Productive Hours or any duration itself — this
// only formats a backend-computed seconds value the same way the backend's
// own format_duration() does ("Xh Ym"), for the rare spot (e.g. a null
// safety fallback) where a pre-formatted _label wasn't already provided.
function fmtHm(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function fmtWeekRange(start: Date) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${fmtLabel(start)} – ${fmtLabel(end)}`;
}

const STATUS_STYLES: Record<string, string> = {
  'In Progress': 'bg-(--color-info-bg) text-(--color-info) border-(--color-info-border)',
  'On Break':    'bg-(--color-warning-bg) text-(--color-warning) border-(--color-warning-border)',
  'Overdue':     'bg-(--color-danger-bg) text-(--color-danger) border-(--color-danger-border)',
  'Pending':     'bg-(--color-warning-bg) text-(--color-warning) border-(--color-warning-border)',
  'Completed':   'bg-(--color-info-bg) text-(--color-brand-primary) border-(--color-info-border)',
};

const VIEW_TABS = ['Weekly', 'Monthly', 'Custom', 'My Requests'];

// Prototype's four summary cards (Total Duration / Total Break Time /
// Total Idle Time / Productive Hours) — values always come straight from
// the backend's canonical totals (WeeklyTimesheetData.total_*_label),
// never recomputed here.
const SummaryCards: React.FC<{ data?: WeeklyTimesheetData }> = ({ data }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <DashboardStatCard
      className="bg-white border border-(--color-card-border) rounded-xl shadow-sm py-4 px-4"
      icon={<Clock size={18} />}
      iconClassName="bg-(--color-info-bg) text-(--color-brand-primary)"
      value={data?.total_duration_label || '0h 0m'}
      label="Total Duration"
    />
    <DashboardStatCard
      className="bg-white border border-(--color-card-border) rounded-xl shadow-sm py-4 px-4"
      icon={<Coffee size={18} />}
      iconClassName="bg-(--color-info-bg) text-(--color-brand-primary)"
      value={data?.total_break_label ?? '—'}
      label="Total Break Time"
    />
    <DashboardStatCard
      className="bg-white border border-(--color-card-border) rounded-xl shadow-sm py-4 px-4"
      icon={<Timer size={18} />}
      iconClassName="bg-(--color-info-bg) text-(--color-brand-primary)"
      value={data?.total_idle_label ?? '—'}
      label="Total Idle Time"
    />
    <DashboardStatCard
      className="bg-white border border-(--color-card-border) rounded-xl shadow-sm py-4 px-4"
      icon={<BarChart3 size={18} />}
      iconClassName="bg-(--color-info-bg) text-(--color-brand-primary)"
      value={data?.total_productive_label ?? '—'}
      label="Productive Hours"
    />
  </div>
);

const EmployeeTimesheet: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Weekly');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const toast = useToastContext();
  const submitClientApproval = useSubmitClientApprovalMutation();
  const [editEntry, setEditEntry] = useState<TimesheetEntry | null>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editReason, setEditReason] = useState('');
  const requestEditMutation = useRequestEntryEditMutation();

  const openEditRequest = (item: TimesheetEntry) => {
    setEditEntry(item);
    setEditCheckIn('');
    setEditCheckOut('');
    setEditReason('');
  };

  const submitEditRequest = () => {
    if (!editEntry?.entry_id) return;
    if (!editReason.trim()) { toast.error('Please explain why you are requesting this correction.'); return; }
    requestEditMutation.mutate(
      { id: editEntry.entry_id, data: { new_check_in: editCheckIn || undefined, new_check_out: editCheckOut || undefined, reason: editReason.trim() } },
      {
        onSuccess: () => { toast.success('Edit request submitted.'); setEditEntry(null); },
        onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to submit edit request.'),
      }
    );
  };

  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));

  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));

  const [customFrom, setCustomFrom] = useState(toDateStr(startOfWeek(new Date())));
  const [customTo, setCustomTo]     = useState(toDateStr(new Date()));
  const [customApplied, setCustomApplied] = useState({ from: customFrom, to: customTo });

  const queryDate = (() => {
    if (activeTab === 'Weekly')  return toDateStr(weekAnchor);
    if (activeTab === 'Monthly') return toDateStr(monthAnchor);
    return undefined;
  })();

  const isTimesheetTab = activeTab !== 'My Requests';
  const isCustomTab = activeTab === 'Custom';
  const { data: weeklyTimesheet, isLoading: isWeeklyLoading } = useGetWeeklyTimesheet(
    { date: queryDate, self: 'true' },
    isTimesheetTab && !isCustomTab
  );
  const { data: rangeTimesheet, isLoading: isRangeLoading } = useGetRangeTimesheet(
    customApplied, isTimesheetTab && isCustomTab
  );
  const timesheet = isCustomTab ? rangeTimesheet : weeklyTimesheet;
  const isLoading = isCustomTab ? isRangeLoading : isWeeklyLoading;
  const { data: timeOffRequests, isLoading: isLoadingRequests } = useGetTimeOffRequests(
    activeTab === 'My Requests'
  );

  const { data: myShift, isLoading: shiftLoading } = useGetMyShiftQuery();
  const { data: mySummary, isLoading: summaryLoading } = useGetMyAttendanceSummary();
  const showPageSkeleton = useShowPageSkeleton(
    isTimesheetTab && isLoading,
    shiftLoading,
    summaryLoading,
  );

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
      render: (item) => <span className="font-bold text-(--color-text-primary)">{item.day_label || fmtLabel(new Date(item.day_date))}</span>,
    },
    {
      header: 'Check In', key: 'check_in',
      render: (item) => <span className={!item.has_entry ? 'text-(--color-text-secondary)' : ''}>{item.check_in || item.no_entry_text}</span>,
    },
    {
      header: 'Check Out', key: 'check_out',
      render: (item) => <span className={!item.has_entry ? 'text-(--color-text-secondary)' : ''}>{item.check_out || item.no_entry_text}</span>,
    },
    { header: 'Duration', key: 'duration_label', render: (item) => <span>{item.duration_label}</span> },
    {
      header: 'Break Time', key: 'break_seconds',
      render: (item) => (
        <span className="text-(--color-text-secondary)">
          {!item.has_entry ? '—' : item.break_seconds == null ? <span title="No break data recorded for this session">—</span> : fmtHm(item.break_seconds)}
        </span>
      ),
    },
    {
      header: 'Idle Time', key: 'idle_seconds',
      render: (item) => (
        <span className="text-(--color-text-secondary)">
          {!item.has_entry ? '—' : item.idle_seconds == null ? <span title="No idle data recorded for this session">—</span> : fmtHm(item.idle_seconds)}
        </span>
      ),
    },
    {
      header: 'Productive Hours', key: 'productive_seconds',
      // Primary working-time metric — visually emphasized per the design
      // reference (bold + accent color), computed by the backend as
      // Total Duration − Break Time − Idle Time (attendance-calculation
      // .service.js). An open/current-day row's value is LIVE — it moves
      // every time this is refetched, never a fabricated "final" total.
      render: (item) => (
        <span className={cn('font-black', item.has_entry ? 'text-emerald-600' : 'text-gray-300')}>
          {!item.has_entry ? '—' : (item.productive_label ?? (item.productive_seconds != null ? fmtHm(item.productive_seconds) : '—'))}
          {item.is_open && item.has_entry && <span className="ml-1 text-[10px] font-bold text-(--color-text-secondary) align-middle">(live)</span>}
        </span>
      ),
    },
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
      header: 'Client Approval', key: 'client_approval_status',
      render: (item) => {
        if (!item.has_entry || !item.entry_id) return <span className="text-(--color-text-secondary)">—</span>;
        if (!item.project_id) return <span className="text-(--color-text-secondary)">—</span>;
        const status = item.client_approval_status;
        if (status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED') {
          return (
            <Badge variant="info" className="rounded-lg px-2 py-0.5 text-[10px] font-bold border">
              {status}
            </Badge>
          );
        }
        if (item.is_open || !item.check_out) {
          return <span className="text-xs text-(--color-text-secondary)">Clock out first</span>;
        }
        return (
          <button
            type="button"
            disabled={submitClientApproval.isPending}
            onClick={async () => {
              try {
                await submitClientApproval.mutateAsync(item.entry_id!);
                toast.success('Submitted for approval');
              } catch (e: any) {
                toast.error(e?.message || 'Failed to submit');
              }
            }}
            className="text-xs font-bold text-(--color-brand-primary) hover:underline disabled:opacity-50"
          >
            Submit
          </button>
        );
      },
    },
    {
      header: '', key: 'actions',
      render: (item) => (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!item.has_entry || !item.entry_id}
            onClick={() => openEditRequest(item)}
            title={item.has_entry ? 'Request a correction' : 'No entry to correct'}
            className="p-1.5 hover:bg-gray-50 text-(--color-text-secondary) hover:text-gray-600 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (showPageSkeleton) return <PageSkeleton variant="timesheet" />;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <RequestTimeOffModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} />

      <Modal
        isOpen={!!editEntry}
        onClose={() => setEditEntry(null)}
        title={`Request Correction — ${editEntry?.day_label || ''}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" animation="none" rounded={false} className="rounded-lg" onClick={() => setEditEntry(null)}>Cancel</Button>
            <Button animation="none" rounded={false} className="rounded-lg bg-(--color-brand-primary) text-white border-0 hover:bg-(--color-brand-primary-hover)" loading={requestEditMutation.isPending} onClick={submitEditRequest}>
              Submit Request
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-(--color-text-secondary)">
            Current: {editEntry?.check_in || '—'} – {editEntry?.check_out || '—'}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Corrected Check In" type="time" value={editCheckIn} onChange={(e) => setEditCheckIn(e.target.value)} />
            <Input label="Corrected Check Out" type="time" value={editCheckOut} onChange={(e) => setEditCheckOut(e.target.value)} />
          </div>
          <Textarea label="Reason *" placeholder="Explain why this correction is needed…" value={editReason} onChange={(e) => setEditReason(e.target.value)} rows={3} />
        </div>
      </Modal>

      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-(--color-text-primary) tracking-tight">Timesheet</h1>
          <p className="text-sm text-(--color-text-secondary) font-medium">View and manage your time entries</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard
          className="bg-white border border-(--color-card-border) rounded-xl shadow-sm py-4 px-4"
          icon={<Briefcase size={18} />}
          iconClassName="bg-(--color-info-bg) text-(--color-brand-primary)"
          value={myShift ? myShift.name : '—'}
          label="My Shift"
          subtext={myShift ? `${myShift.start_time}–${myShift.end_time}` : 'No shift assigned'}
        />
        <DashboardStatCard
          className="bg-white border border-(--color-card-border) rounded-xl shadow-sm py-4 px-4"
          icon={<Calendar size={18} />}
          iconClassName="bg-(--color-info-bg) text-(--color-brand-primary)"
          value={mySummary?.present_days ?? '—'}
          label="Working Days"
          subtext="This month"
        />
        <DashboardStatCard
          className="bg-white border border-(--color-card-border) rounded-xl shadow-sm py-4 px-4"
          icon={<Clock size={18} />}
          iconClassName="bg-(--color-info-bg) text-(--color-brand-primary)"
          value={mySummary?.late_days ?? '—'}
          label="Late Count"
          subtext="This month"
        />
        <DashboardStatCard
          className="bg-white border border-(--color-card-border) rounded-xl shadow-sm py-4 px-4"
          icon={<Timer size={18} />}
          iconClassName="bg-(--color-info-bg) text-(--color-brand-primary)"
          value={mySummary?.total_late_minutes ?? '—'}
          label="Late Minutes"
          subtext="Total this month"
        />
      </div>

      <Tabs options={VIEW_TABS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'Weekly' && (
        <div className="flex flex-col gap-4">
          <SummaryCards data={weeklyTimesheet} />
        <Card className="flex flex-col gap-4 border border-(--color-card-border) shadow-sm p-0 overflow-hidden bg-white">
          <div className="flex items-center justify-between px-5 pt-5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-(--color-info-bg) text-(--color-brand-primary) flex items-center justify-center">
                <Calendar size={16} />
              </div>
              <h2 className="text-lg font-black text-(--color-text-primary)">{fmtWeekRange(weekAnchor)}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}
                className="p-2 rounded-lg hover:bg-gray-100 text-(--color-text-secondary)"
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
                className="p-2 rounded-lg hover:bg-gray-100 text-(--color-text-secondary)"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="px-5 text-sm text-(--color-text-secondary) font-medium">
            Total: <span className="text-(--color-text-primary) font-bold">{timesheet?.total_duration_label || '0h 0m'}</span>
          </div>
          <div className="px-4 pb-4">
            <Table columns={columns} data={timesheet?.rows || []} isLoading={isLoading}
              className="border-none shadow-none" headerClassName="bg-(--color-elevated) border-none rounded-xl" />
          </div>
        </Card>
        </div>
      )}

      {activeTab === 'Monthly' && (
        <Card className="flex flex-col gap-4 border border-(--color-card-border) shadow-sm p-0 overflow-hidden bg-white">
          <div className="flex items-center justify-between px-5 pt-5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-(--color-info-bg) text-(--color-brand-primary) flex items-center justify-center">
                <Calendar size={16} />
              </div>
              <h2 className="text-lg font-black text-(--color-text-primary)">{fmtMonthYear(monthAnchor)}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonthAnchor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="p-2 rounded-lg hover:bg-gray-100 text-(--color-text-secondary)"
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
                className="p-2 rounded-lg hover:bg-gray-100 text-(--color-text-secondary)"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <MonthlyWeeks monthAnchor={monthAnchor} columns={columns} />
        </Card>
      )}

      {activeTab === 'Custom' && (
        <div className="flex flex-col gap-4">
        <SummaryCards data={rangeTimesheet} />
        <Card className="flex flex-col gap-4 border border-(--color-card-border) shadow-sm p-0 overflow-hidden bg-white">
          <div className="flex flex-wrap items-end gap-3 px-5 pt-5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-(--color-text-secondary) uppercase tracking-wide">From</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-(--color-text-secondary) uppercase tracking-wide">To</label>
              <input type="date" value={customTo} min={customFrom} onChange={e => setCustomTo(e.target.value)}
                className="h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
            </div>
            <Button variant="primary" className="h-10 px-5 rounded-xl"
              onClick={() => setCustomApplied({ from: customFrom, to: customTo })}>
              Apply
            </Button>
          </div>
          <div className="px-5 text-sm text-(--color-text-secondary) font-medium">
            {customApplied.from} → {customApplied.to} · Total:{' '}
            <span className="text-(--color-text-primary) font-bold">{timesheet?.total_duration_label || '0h 0m'}</span>
          </div>
          <div className="px-4 pb-4">
            <Table columns={columns} data={timesheet?.rows || []} isLoading={isLoading}
              className="border-none shadow-none" headerClassName="bg-(--color-elevated) border-none rounded-xl" />
          </div>
        </Card>
        </div>
      )}

      {activeTab === 'My Requests' && (
        <div className="flex flex-col gap-6 bg-white p-6 rounded-xl border border-(--color-card-border) shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-(--color-info-bg) text-(--color-brand-primary) flex items-center justify-center">
                <Calendar size={16} />
              </div>
              <h2 className="text-xl font-black text-(--color-text-primary) tracking-tight">My Requests</h2>
            </div>
            <PageActionButton leftIcon={Calendar} onClick={() => setIsRequestModalOpen(true)}>
              Request Time Off
            </PageActionButton>
          </div>

          <div className="flex flex-col gap-6">
            {isLoadingRequests ? (
              <div className="flex flex-col gap-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : (
              <>
            <h3 className="text-base font-bold text-(--color-text-primary)">Time Off Requests</h3>
            {timeOffRequests?.time_off_requests?.length ? timeOffRequests.time_off_requests.map((req: any) => (
              <Card key={req.id} className="p-5 flex flex-col gap-3 bg-white border border-(--color-card-border) shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-(--color-text-primary)">{req.policy_name || 'Leave Request'}</h3>
                      <Badge variant={req.status === 'REJECTED' ? 'error' : 'success'}
                        className={cn('px-2 py-0.5 text-[10px] font-bold rounded-lg',
                          req.status === 'REJECTED' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-green-50 text-green-500 border-green-100')}>
                        {req.status_label || req.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-(--color-text-secondary) font-bold">{fmtRequestDateRange(req.start_date, req.end_date) || '—'}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-base font-black text-(--color-text-primary)">{req.days ? `${req.days} days` : 'N/A'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="bg-gray-50/80 p-3 rounded-xl border border-(--color-card-border)">
                    <p className="text-[14px] font-bold text-(--color-text-secondary)">Reason: <span className="font-medium text-gray-600">{req.reason}</span></p>
                  </div>
                  {req.manager_comment && (
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-(--color-card-border)">
                      <p className="text-[14px] font-bold text-(--color-text-secondary)">Manager comment: <span className="font-medium text-gray-600">{req.manager_comment}</span></p>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-(--color-text-secondary)">{req.submitted_at_label}</span>
              </Card>
            )) : (
              <div className="py-10 text-center rounded-xl border border-dashed border-gray-200 bg-(--color-elevated)">
                <Calendar size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-(--color-text-secondary) font-medium">No time off requests yet</p>
              </div>
            )}

            <div className="mt-4">
              <h3 className="text-base font-bold text-(--color-text-primary)">Timesheet Edit Requests</h3>
              {timeOffRequests?.timesheet_edit_requests?.length ? timeOffRequests.timesheet_edit_requests.map((req: any) => (
                  <Card key={req.id} className="p-5 flex flex-col gap-3 mt-4 border border-(--color-card-border) shadow-sm">
                    <h3 className="font-bold text-(--color-text-primary)">{req.name || 'Edit Request'}</h3>
                    <p className="text-sm text-(--color-text-secondary)">{req.reason}</p>
                    <Badge variant="info" className={cn('!w-max px-2 py-0.5 text-[10px] font-bold rounded-lg border',
                      req.status === 'Pending' ? 'bg-orange-50 text-orange-500 border-orange-100' : 'bg-gray-50 text-(--color-text-secondary)')}>
                      {req.status}
                    </Badge>
                  </Card>
                )) : (
              <div className="py-10 mt-3 text-center rounded-xl border border-dashed border-gray-200 bg-(--color-elevated)">
                <Clock size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-(--color-text-secondary) font-medium">No edit requests yet</p>
              </div>
            )}
            </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MonthlyWeeks: React.FC<{ monthAnchor: Date; columns: Column<TimesheetEntry>[] }> = ({ monthAnchor, columns }) => {

  const weeks: Date[] = [];
  const cur = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const seen = new Set<string>();
  while (cur.getMonth() === monthAnchor.getMonth()) {
    const ws = startOfWeek(new Date(cur));
    const key = toDateStr(ws);
    if (!seen.has(key)) { seen.add(key); weeks.push(ws); }
    cur.setDate(cur.getDate() + 7);
  }

  const weeksKey = weeks.map(toDateStr).join(',');
  const [remaining, setRemaining] = useState(weeks.length);

  useEffect(() => {
    setRemaining(weeks.length);
  }, [weeksKey, weeks.length]);

  const onWeekReady = useCallback(() => {
    setRemaining((count) => Math.max(0, count - 1));
  }, []);

  return (
    <>
      {remaining > 0 && (
        <div className="px-4 pb-4">
          <TableSkeleton rows={7} columns={columns.length} />
        </div>
      )}
      <div className={cn('flex flex-col divide-y divide-gray-100', remaining > 0 && 'hidden')}>
        {weeks.map((ws) => (
          <WeekBlock key={toDateStr(ws)} weekStart={ws} columns={columns} onReady={onWeekReady} />
        ))}
      </div>
    </>
  );
};

const WeekBlock: React.FC<{
  weekStart: Date;
  columns: Column<TimesheetEntry>[];
  onReady: () => void;
}> = ({ weekStart, columns, onReady }) => {
  const { data: timesheet, isLoading } = useGetWeeklyTimesheet({ date: toDateStr(weekStart), self: 'true' }, true);

  useEffect(() => {
    if (!isLoading) onReady();
  }, [isLoading, onReady]);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-black text-gray-700">{fmtWeekRange(weekStart)}</span>
        <span className="text-xs text-(--color-text-secondary) font-semibold">{timesheet?.total_duration_label || '—'}</span>
      </div>
      <Table columns={columns} data={timesheet?.rows || []}
        className="border-none shadow-none text-sm" headerClassName="bg-(--color-elevated)/50 rounded-lg" />
    </div>
  );
};

export default EmployeeTimesheet;
