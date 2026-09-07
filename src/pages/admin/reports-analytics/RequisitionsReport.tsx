import React, { useMemo, useState } from 'react';
import { ClipboardList, Clock3, CheckCircle2, XCircle, PackageCheck, Search } from 'lucide-react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import SearchableSelect from '@/components/ui/SearchableSelect';
import StatusBadge, { BadgeTone } from '@/components/ui/StatusBadge';
import { KpiRow } from './components/KpiRow';
import { TrendChart } from './components/TrendChart';
import { BreakdownList } from './components/BreakdownList';
import { ExportMenu } from './components/ExportMenu';
import { DEPARTMENTS, generateRequisitionRows, generateRequisitionTrend, type RequisitionRow } from './mockData';

const PERIOD_OPTIONS = [
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 14 Days', value: '14' },
  { label: 'Last 30 Days', value: '30' },
];

const PAGE_SIZE = 8;
const TYPES: RequisitionRow['type'][] = ['Hardware', 'Software', 'Office Supplies', 'Travel', 'Other'];
const STATUSES: RequisitionRow['status'][] = ['Draft', 'Submitted', 'Approved', 'Rejected', 'Fulfilled', 'Closed'];

const STATUS_TONE: Partial<Record<RequisitionRow['status'], BadgeTone>> = {
  Submitted: 'warning',
  Fulfilled: 'success',
  Closed: 'neutral',
};

const ALL_ROWS = generateRequisitionRows(48);

export const RequisitionsReport: React.FC = () => {
  const [period, setPeriod] = useState('14');
  const [type, setType] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const trend = useMemo(() => generateRequisitionTrend(Number(period)), [period]);

  const filteredRows = useMemo(() => {
    return ALL_ROWS.filter((r) => {
      if (type && r.type !== type) return false;
      if (department && r.department !== department) return false;
      if (status && r.status !== status) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.requestedBy.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [type, department, status, search]);

  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(() => {
    const pending = ALL_ROWS.filter((r) => r.status === 'Draft' || r.status === 'Submitted').length;
    const approved = ALL_ROWS.filter((r) => r.status === 'Approved').length;
    const rejected = ALL_ROWS.filter((r) => r.status === 'Rejected').length;
    const completed = ALL_ROWS.filter((r) => r.status === 'Fulfilled' || r.status === 'Closed').length;
    return { total: ALL_ROWS.length, pending, approved, rejected, completed };
  }, []);

  const statusBreakdown = useMemo(() => {
    const colors: Record<string, string> = { Draft: 'bg-gray-400', Submitted: 'bg-amber-500', Approved: 'bg-green-500', Rejected: 'bg-red-500', Fulfilled: 'bg-blue-500', Closed: 'bg-slate-500' };
    return STATUSES.map((s) => ({
      label: s,
      count: ALL_ROWS.filter((r) => r.status === s).length,
      color: colors[s],
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

  const columns: Column<RequisitionRow>[] = [
    { header: 'Requisition', key: 'title', render: (r) => <p className="font-semibold text-gray-900">{r.title}</p> },
    { header: 'Type', key: 'type' },
    { header: 'Requested By', key: 'requestedBy' },
    { header: 'Department', key: 'department' },
    { header: 'Date', key: 'date' },
    { header: 'Amount', key: 'amount', align: 'right', render: (r) => `$${r.amount.toLocaleString()}` },
    { header: 'Status', key: 'status', render: (r) => <StatusBadge status={r.status} tone={STATUS_TONE[r.status]} size="sm" /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <KpiRow
        cards={[
          { icon: ClipboardList, color: 'bg-blue-500', label: 'Total Requisitions', value: totals.total },
          { icon: Clock3, color: 'bg-amber-500', label: 'Pending', value: totals.pending },
          { icon: CheckCircle2, color: 'bg-green-500', label: 'Approved', value: totals.approved },
          { icon: XCircle, color: 'bg-red-500', label: 'Rejected', value: totals.rejected },
          { icon: PackageCheck, color: 'bg-indigo-500', label: 'Completed', value: totals.completed },
        ]}
      />

      <Card className="border-none shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Requisition Overview</p>
          <div className="w-40">
            <SearchableSelect options={PERIOD_OPTIONS} value={period} onChange={(v) => setPeriod(String(v))} />
          </div>
        </div>
        <TrendChart data={trend} xKey="date" series={[{ key: 'requisitions', label: 'Requisitions', color: '#2563EB' }]} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">By Status</p>
          <BreakdownList items={statusBreakdown} />
        </Card>
        <Card className="border-none shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">By Type</p>
          <BreakdownList items={typeBreakdown} />
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Requisition Details</p>
          <ExportMenu
            rows={filteredRows}
            filenamePrefix="Requisitions_Report"
            columns={[
              { key: 'title', label: 'Requisition' },
              { key: 'type', label: 'Type' },
              { key: 'requestedBy', label: 'Requested By' },
              { key: 'department', label: 'Department' },
              { key: 'date', label: 'Date' },
              { key: 'amount', label: 'Amount' },
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
              placeholder="Search requisition or requester…"
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
          emptyMessage="No requisitions match your filters."
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

export default RequisitionsReport;
