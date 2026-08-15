import React, { useMemo, useState } from 'react';
import { Ticket, CircleDot, Loader2, CheckCircle2, Lock, Search, Timer } from 'lucide-react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import SearchableSelect from '@/components/ui/SearchableSelect';
import StatusBadge, { BadgeTone } from '@/components/ui/StatusBadge';
import { KpiRow } from './components/KpiRow';
import { TrendChart } from './components/TrendChart';
import { BreakdownList } from './components/BreakdownList';
import { ExportMenu } from './components/ExportMenu';
import { generateTicketRows, generateTicketTrend, type TicketRow } from './mockData';

const PERIOD_OPTIONS = [
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 14 Days', value: '14' },
  { label: 'Last 30 Days', value: '30' },
];

const PAGE_SIZE = 8;
const TYPES: TicketRow['type'][] = ['IT Support', 'HR', 'Facilities', 'Finance', 'Access Request'];
const PRIORITIES: TicketRow['priority'][] = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES: TicketRow['status'][] = ['Open', 'In Progress', 'Resolved', 'Closed'];

// "Open"/"Resolved"/"Closed" aren't in StatusBadge's canonical map (only
// "inprogress" is) — overridden here rather than adding ticket-specific
// entries to the shared map.
const STATUS_TONE: Partial<Record<TicketRow['status'], BadgeTone>> = {
  Open: 'info',
  Resolved: 'success',
  Closed: 'neutral',
};

const PRIORITY_TONE: Record<TicketRow['priority'], BadgeTone> = {
  Critical: 'danger',
  High: 'warning',
  Medium: 'info',
  Low: 'neutral',
};

const ALL_ROWS = generateTicketRows(52);

export const TicketsReport: React.FC = () => {
  const [period, setPeriod] = useState('14');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const trend = useMemo(() => generateTicketTrend(Number(period)), [period]);

  const filteredRows = useMemo(() => {
    return ALL_ROWS.filter((r) => {
      if (type && r.type !== type) return false;
      if (priority && r.priority !== priority) return false;
      if (status && r.status !== status) return false;
      if (search && !r.subject.toLowerCase().includes(search.toLowerCase()) && !r.ticket.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [type, priority, status, search]);

  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(() => ({
    total: ALL_ROWS.length,
    open: ALL_ROWS.filter((r) => r.status === 'Open').length,
    inProgress: ALL_ROWS.filter((r) => r.status === 'In Progress').length,
    resolved: ALL_ROWS.filter((r) => r.status === 'Resolved').length,
    closed: ALL_ROWS.filter((r) => r.status === 'Closed').length,
  }), []);

  const avgResolutionHours = useMemo(() => {
    const resolved = ALL_ROWS.filter((r) => r.resolutionHours != null);
    if (resolved.length === 0) return null;
    const sum = resolved.reduce((acc, r) => acc + (r.resolutionHours ?? 0), 0);
    return Math.round((sum / resolved.length) * 10) / 10;
  }, []);

  const priorityBreakdown = useMemo(() => {
    const colors: Record<TicketRow['priority'], string> = { Critical: 'bg-red-600', High: 'bg-amber-500', Medium: 'bg-blue-500', Low: 'bg-gray-400' };
    return PRIORITIES.map((p) => ({
      label: p,
      count: ALL_ROWS.filter((r) => r.priority === p).length,
      color: colors[p],
    })).sort((a, b) => b.count - a.count);
  }, []);

  const typeBreakdown = useMemo(() => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500'];
    return TYPES.map((t, i) => ({
      label: t,
      count: ALL_ROWS.filter((r) => r.type === t).length,
      color: colors[i % colors.length],
    })).sort((a, b) => b.count - a.count);
  }, []);

  const columns: Column<TicketRow>[] = [
    { header: 'Ticket', key: 'ticket' },
    { header: 'Subject', key: 'subject', render: (r) => <p className="font-semibold text-gray-900 max-w-[220px] truncate">{r.subject}</p> },
    { header: 'Type', key: 'type' },
    { header: 'Priority', key: 'priority', render: (r) => <StatusBadge status={r.priority} tone={PRIORITY_TONE[r.priority]} size="sm" /> },
    { header: 'Requester', key: 'requester' },
    { header: 'Department', key: 'department' },
    { header: 'Assigned To', key: 'assignedTo' },
    { header: 'Created', key: 'created' },
    { header: 'Status', key: 'status', render: (r) => <StatusBadge status={r.status} tone={STATUS_TONE[r.status]} size="sm" /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <KpiRow
        cards={[
          { icon: Ticket, color: 'bg-blue-500', label: 'Total Tickets', value: totals.total },
          { icon: CircleDot, color: 'bg-cyan-500', label: 'Open', value: totals.open },
          { icon: Loader2, color: 'bg-amber-500', label: 'In Progress', value: totals.inProgress },
          { icon: CheckCircle2, color: 'bg-green-500', label: 'Resolved', value: totals.resolved },
          { icon: Lock, color: 'bg-gray-500', label: 'Closed', value: totals.closed },
        ]}
      />

      <Card className="border-none shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ticket Overview</p>
          </div>
          <div className="flex items-center gap-3">
            {avgResolutionHours != null && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
                <Timer size={13} className="text-primary-500" /> Avg. resolution: <span className="text-gray-900 font-black">{avgResolutionHours}h</span>
              </span>
            )}
            <div className="w-40">
              <SearchableSelect options={PERIOD_OPTIONS} value={period} onChange={(v) => setPeriod(String(v))} />
            </div>
          </div>
        </div>
        <TrendChart
          data={trend}
          xKey="date"
          series={[
            { key: 'created', label: 'Created', color: '#2563EB' },
            { key: 'resolved', label: 'Resolved', color: '#22C55E' },
          ]}
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Priority Breakdown</p>
          <BreakdownList items={priorityBreakdown} />
        </Card>
        <Card className="border-none shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Type Breakdown</p>
          <BreakdownList items={typeBreakdown} />
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ticket Details</p>
          <ExportMenu
            rows={filteredRows}
            filenamePrefix="Tickets_Report"
            columns={[
              { key: 'ticket', label: 'Ticket' },
              { key: 'subject', label: 'Subject' },
              { key: 'type', label: 'Type' },
              { key: 'priority', label: 'Priority' },
              { key: 'requester', label: 'Requester' },
              { key: 'department', label: 'Department' },
              { key: 'assignedTo', label: 'Assigned To' },
              { key: 'created', label: 'Created' },
              { key: 'status', label: 'Status' },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search ticket or subject…"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
            />
          </div>
          <div className="w-44">
            <SearchableSelect
              options={TYPES.map((t) => ({ label: t, value: t }))}
              value={type}
              onChange={(v) => { setType(v ? String(v) : ''); setPage(1); }}
              placeholder="All Types"
              clearable
            />
          </div>
          <div className="w-40">
            <SearchableSelect
              options={PRIORITIES.map((p) => ({ label: p, value: p }))}
              value={priority}
              onChange={(v) => { setPriority(v ? String(v) : ''); setPage(1); }}
              placeholder="All Priorities"
              clearable
            />
          </div>
          <div className="w-40">
            <SearchableSelect
              options={STATUSES.map((s) => ({ label: s, value: s }))}
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
          emptyMessage="No tickets match your filters."
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

export default TicketsReport;
