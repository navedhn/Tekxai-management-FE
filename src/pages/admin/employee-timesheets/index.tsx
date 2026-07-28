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

// ── Local, timezone-safe date helpers (mirrors employee/timesheet/index.tsx's
// own toDateStr — not reused via import because that file has no exported
// helpers, and duplicating three lines here is simpler than exporting for one
// caller). ──────────────────────────────────────────────────────────────────
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

const PERIODS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Custom', value: 'custom' },
];

// Resolves the exact [start,end] date range for the Summary Cards. Kept
// independent of the backend's own week-vs-range branching inside
// get_employee_timesheet_ctrl — the summary is always a plain aggregate over
// a date range, so it doesn't need "which day of the week does this land on"
// logic at all.
function resolveSummaryRange(period: string, customFrom: string, customTo: string): { start: string; end: string } {
  const now = new Date();
  if (period === 'today') return { start: toDateStr(now), end: toDateStr(now) };
  if (period === 'yesterday') {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return { start: toDateStr(d), end: toDateStr(d) };
  }
  if (period === 'this_week') return { start: toDateStr(startOfWeek(now)), end: toDateStr(now) };
  if (period === 'last_week') {
    const ws = startOfWeek(now); ws.setDate(ws.getDate() - 7);
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    return { start: toDateStr(ws), end: toDateStr(we) };
  }
  if (period === 'this_month') return { start: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), end: toDateStr(now) };
  if (period === 'last_month') {
    return {
      start: toDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      end: toDateStr(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  return { start: customFrom, end: customTo }; // custom
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

  // Employee Profile's "Open Full Timesheet" link passes ?user_id= — this
  // screen must reuse itself for that entry point rather than a separate
  // profile-embedded copy, per the no-duplicated-UI requirement. We only
  // have the id from the URL, not the full employee record the search box
  // needs to render a selected-state chip, so we fetch it via the same
  // search endpoint, keyed on the id.
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
    // Admin-only columns. Source/Notes only ever populate for This Month /
    // Last Month / Custom periods (build_range_rows) — Today/Yesterday/This
    // Week/Last Week reuse the employee's own unmodified build_week_rows,
    // which doesn't carry these fields. Rendering '—' for the absent case is
    // an honest gap, not a fabricated value.
    {
      header: 'Source', key: 'checkout_source' as any,
      render: (item: any) => <span className="text-gray-500">{item.checkout_source || '—'}</span>,
    },
    {
      header: 'Notes', key: 'note' as any,
      render: (item: any) => <span className="text-gray-500 truncate max-w-[160px] inline-block">{item.note || '—'}</span>,
    },
    // Correction Status: no per-entry correction/edit-approval tracking is
    // wired to these rows yet (that data lives separately as standalone
    // Timesheet Edit Requests, not joined here) — shown as a static, honest
    // placeholder rather than fabricated.
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
