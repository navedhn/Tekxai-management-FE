import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Button from '@/components/ui/Button';
import EmployeeSearchInput, { EmployeeSearchResult } from '@/components/ui/EmployeeSearchInput';
import { Download, FileSpreadsheet, FileText, Eye, Pencil, CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useGetMyAttendanceSummary } from '@/services/attendanceService';
import { useGetEmployeeTimesheet } from '@/services/attendanceService';
import { TimesheetEntry } from '@/services/timesheetService';

const KARACHI_TZ = 'Asia/Karachi';
const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000;
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function karachiParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: KARACHI_TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { year: +get('year'), month: +get('month'), day: +get('day'), weekday: get('weekday') };
}

function karachiDateFromParts(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day) - KARACHI_OFFSET_MS);
}

export function toDateStr(d: Date) {
  const { year, month, day } = karachiParts(d);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function startOfWeek(d: Date) {
  const { year, month, day, weekday } = karachiParts(d);
  const dow = WEEKDAY_INDEX[weekday];
  const diff = day - dow + (dow === 0 ? -6 : 1);
  return karachiDateFromParts(year, month, diff);
}

export function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}

export function startOfMonth(d: Date, monthOffset = 0) {
  const { year, month } = karachiParts(d);
  return karachiDateFromParts(year, month + monthOffset, 1);
}

const PERIODS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Custom', value: 'custom' },
];

export function resolveSummaryRange(period: string, customFrom: string, customTo: string): { start: string; end: string } {
  const now = new Date();
  if (period === 'today') return { start: toDateStr(now), end: toDateStr(now) };
  if (period === 'yesterday') {
    const d = addDays(now, -1);
    return { start: toDateStr(d), end: toDateStr(d) };
  }
  if (period === 'this_week') return { start: toDateStr(startOfWeek(now)), end: toDateStr(now) };
  if (period === 'last_week') {
    const ws = addDays(startOfWeek(now), -7);
    const we = addDays(ws, 6);
    return { start: toDateStr(ws), end: toDateStr(we) };
  }
  if (period === 'this_month') return { start: toDateStr(startOfMonth(now)), end: toDateStr(now) };
  if (period === 'last_month') {
    return {
      start: toDateStr(startOfMonth(now, -1)),
      end: toDateStr(addDays(startOfMonth(now), -1)),
    };
  }
  return { start: customFrom, end: customTo };
}

function toCsv(rows: TimesheetEntry[]): string {
  const headers = ['Date', 'Check In', 'Check Out', 'Duration', 'Status'];
  const lines = rows.map((r) => [
    r.day_label || r.day_date,
    r.check_in || 'No entry',
    r.check_out || 'No entry',
    r.duration_label || '—',
    r.status_label || r.status || '—',
  ]);
  return [headers, ...lines]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

const EmployeeTimesheets: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedUserId = searchParams.get('user_id') || undefined;

  const [selected, setSelected] = useState<EmployeeSearchResult | null>(null);
  const [period, setPeriod] = useState('this_week');
  const [customFrom, setCustomFrom] = useState(toDateStr(startOfWeek(new Date())));
  const [customTo, setCustomTo] = useState(toDateStr(new Date()));
  const [customApplied, setCustomApplied] = useState({ from: customFrom, to: customTo });

  const [resolvingPreselect, setResolvingPreselect] = useState(!!preselectedUserId);

  React.useEffect(() => {
    if (!preselectedUserId) return;
    import('@/lib/queryClient').then(({ apiRequest }) => {
      apiRequest<any>(`api/v1/user/${preselectedUserId}`)
        .then((res) => { if (res?.payload) setSelected(res.payload); })
        .finally(() => setResolvingPreselect(false));
    });
  }, [preselectedUserId]);

  const employee = selected;

  const summaryRange = resolveSummaryRange(period, customApplied.from, customApplied.to);
  const { data: summary, isLoading: isLoadingSummary } = useGetMyAttendanceSummary(
    employee ? { user_id: employee.id, start_date: summaryRange.start, end_date: summaryRange.end } : undefined,
    { enabled: !!employee }
  );

  const { data: timesheet, isLoading: isLoadingTable } = useGetEmployeeTimesheet(
    {
      user_id: employee?.id || '',
      period,
      ...(period === 'custom' ? { start_date: customApplied.from, end_date: customApplied.to } : {}),
    },
    { enabled: !!employee }
  );

  const rows: TimesheetEntry[] = timesheet?.rows || [];

  const columns: Column<TimesheetEntry>[] = useMemo(() => [
    {
      header: 'Date', key: 'day_date',
      render: (item) => <span className="font-bold text-gray-900">{item.day_label || item.day_date}</span>,
    },
    {
      header: 'Check In', key: 'check_in',
      render: (item) => <span className={!item.has_entry ? 'text-gray-400' : ''}>{item.check_in || item.no_entry_text || 'No entry'}</span>,
    },
    {
      header: 'Check Out', key: 'check_out',
      render: (item) => <span className={!item.has_entry ? 'text-gray-400' : ''}>{item.check_out || item.no_entry_text || 'No entry'}</span>,
    },
    { header: 'Duration', key: 'duration_label', render: (item) => <span>{item.duration_label}</span> },
    {
      header: 'Break Time', key: 'break_seconds',
      render: (item) => <span className="text-gray-500">{!item.has_entry ? '—' : item.break_seconds == null ? '—' : item.break_seconds ? `${Math.floor(item.break_seconds / 3600)}h ${Math.floor((item.break_seconds % 3600) / 60)}m` : '0h 0m'}</span>,
    },
    {
      header: 'Idle Time', key: 'idle_seconds',
      render: (item) => <span className="text-gray-500">{!item.has_entry ? '—' : item.idle_seconds == null ? '—' : item.idle_seconds ? `${Math.floor(item.idle_seconds / 3600)}h ${Math.floor((item.idle_seconds % 3600) / 60)}m` : '0h 0m'}</span>,
    },
    {
      header: 'Productive Hours', key: 'productive_seconds',
      render: (item) => <span className={item.has_entry ? 'font-black text-emerald-600' : 'text-gray-300'}>{!item.has_entry ? '—' : item.productive_label ?? '—'}</span>,
    },
    {
      header: 'Status', key: 'status',
      render: (item) => {
        if (!item.has_entry && !item.status) return <span className="text-gray-300">—</span>;
        return (
          <Badge variant="info" className="rounded-lg px-2 py-0.5 text-[10px] font-bold border bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]">
            {item.status_label || item.status}
          </Badge>
        );
      },
    },

    {
      header: 'Source', key: 'checkout_source' as any,
      render: (item: any) => <span className="text-gray-500">{item.checkout_source || '—'}</span>,
    },
    {
      header: 'Notes', key: 'note' as any,
      render: (item: any) => <span className="text-gray-500 truncate max-w-[160px] inline-block">{item.note || '—'}</span>,
    },

    {
      header: 'Correction', key: 'correction' as any,
      render: () => <span className="text-gray-300">—</span>,
    },
    {
      header: '', key: 'row_actions' as any,
      render: () => (
        <div className="flex items-center justify-end gap-1">
          {[
            { icon: Eye, label: 'View' },
            { icon: Pencil, label: 'Correct' },
            { icon: CheckCircle2, label: 'Approve' },
            { icon: ShieldAlert, label: 'Override' },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              disabled
              title={`${label} — not yet available`}
              className="p-1.5 rounded-lg text-gray-300 cursor-not-allowed"
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      ),
    },
  ], []);

  const handleExportCsv = () => {
    if (!rows.length) return;
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const namePart = employee ? `${employee.first_name}-${employee.last_name}`.toLowerCase() : 'employee';
    a.href = url; a.download = `timesheet-${namePart}-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    { label: 'Present Days', value: summary?.present_days },
    { label: 'Late Days', value: summary?.late_days },
    { label: 'Leave Days', value: summary?.leave_days },
    { label: 'Hours Worked', value: summary?.total_hours },
    { label: 'Average Check In', value: summary?.average_check_in },
    { label: 'Missing Checkout', value: summary?.missing_checkout_count },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Employee Timesheets</h1>
        <p className="text-sm text-gray-400 font-bold">Look up any employee's complete attendance timesheet</p>
      </div>

      <Card className="flex flex-col gap-4 shadow-xl border-none bg-white">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Employee</label>
            <EmployeeSearchInput
              selected={employee}
              onSelect={setSelected}
              onClear={() => setSelected(null)}
            />
          </div>
          <div className="w-full md:w-56">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Period</label>
            <SearchableSelect options={PERIODS} value={period} onChange={(v) => setPeriod(String(v))} />
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">From</label>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">To</label>
              <input type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)}
                className="h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
            </div>
            <Button variant="primary" className="h-10 px-5 rounded-xl"
              onClick={() => setCustomApplied({ from: customFrom, to: customTo })}>
              Apply
            </Button>
          </div>
        )}
      </Card>

      {resolvingPreselect ? (
        <Card className="py-10 text-center text-sm text-gray-400 font-bold">Loading employee…</Card>
      ) : !employee ? (
        <Card className="py-16 text-center shadow-xl border-none bg-white">
          <p className="text-sm text-gray-400 font-bold">Search for an employee above to view their timesheet.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {summaryCards.map((s) => (
              <Card key={s.label} className="text-center py-6 shadow-xl border-none bg-white">
                <p className="text-xl font-black text-gray-900">
                  {isLoadingSummary ? '—' : (s.value ?? '—')}
                </p>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide mt-1">{s.label}</p>
              </Card>
            ))}
          </div>

          <Card className="flex flex-col gap-4 shadow-xl border-none p-0 overflow-hidden bg-white">
            <div className="flex items-center justify-between px-4 pt-4">
              <div>
                <h2 className="text-lg font-black text-gray-900">{employee.first_name} {employee.last_name}</h2>
                <p className="text-xs text-gray-400 font-semibold">
                  {timesheet?.range_start} → {timesheet?.range_end} &nbsp;·&nbsp; Total:{' '}
                  <span className="text-gray-900 font-black">{timesheet?.total_duration_label || '0h 0m'}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" leftIcon={Download} onClick={handleExportCsv} disabled={!rows.length}>
                  Export CSV
                </Button>
                <button type="button" disabled title="Excel export — coming soon"
                  className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-300 cursor-not-allowed flex items-center gap-1.5">
                  <FileSpreadsheet size={14} /> Excel
                </button>
                <button type="button" disabled title="PDF export — coming soon"
                  className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-300 cursor-not-allowed flex items-center gap-1.5">
                  <FileText size={14} /> PDF
                </button>
              </div>
            </div>
            <div className="px-4 pb-4">
              <Table columns={columns} data={rows} isLoading={isLoadingTable}
                className="border-none shadow-none" headerClassName="bg-[#F0F5FF]/50 border-none rounded-xl" />
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default EmployeeTimesheets;
