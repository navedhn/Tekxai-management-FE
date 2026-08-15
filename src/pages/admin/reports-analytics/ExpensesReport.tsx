import React, { useMemo, useState } from 'react';
import { Wallet, CheckCircle2, Clock3, XCircle, TrendingUp, Hash, Search } from 'lucide-react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import SearchableSelect from '@/components/ui/SearchableSelect';
import StatusBadge from '@/components/ui/StatusBadge';
import { KpiRow } from './components/KpiRow';
import { TrendChart } from './components/TrendChart';
import { BreakdownList } from './components/BreakdownList';
import { ExportMenu } from './components/ExportMenu';
import { DEPARTMENTS, EXPENSE_CATEGORIES, generateExpenseRows, generateExpenseTrend, type ExpenseRow } from './mockData';

const MONTH_PERIOD_OPTIONS = [
  { label: 'Last 6 Months', value: '6' },
  { label: 'Last 12 Months', value: '12' },
];

const PAGE_SIZE = 8;
const STATUSES: ExpenseRow['status'][] = ['Pending', 'Approved', 'Rejected'];
const CATEGORY_NAMES = EXPENSE_CATEGORIES.map((c) => c.name);

function formatCurrency(n: number) {
  return `$${n.toLocaleString()}`;
}

const ALL_ROWS = generateExpenseRows(58);

export const ExpensesReport: React.FC = () => {
  const [months, setMonths] = useState('6');
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const trend = useMemo(() => generateExpenseTrend(Number(months)), [months]);

  const filteredRows = useMemo(() => {
    return ALL_ROWS.filter((r) => {
      if (category && r.category !== category) return false;
      if (department && r.department !== department) return false;
      if (status && r.status !== status) return false;
      if (search && !r.employee.toLowerCase().includes(search.toLowerCase()) && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [category, department, status, search]);

  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(() => {
    const approvedRows = ALL_ROWS.filter((r) => r.status === 'Approved');
    const pendingRows = ALL_ROWS.filter((r) => r.status === 'Pending');
    const rejectedRows = ALL_ROWS.filter((r) => r.status === 'Rejected');
    const totalAmount = ALL_ROWS.reduce((sum, r) => sum + r.amount, 0);
    return {
      count: ALL_ROWS.length,
      totalAmount,
      approvedAmount: approvedRows.reduce((sum, r) => sum + r.amount, 0),
      pendingAmount: pendingRows.reduce((sum, r) => sum + r.amount, 0),
      rejectedAmount: rejectedRows.reduce((sum, r) => sum + r.amount, 0),
      average: Math.round(totalAmount / ALL_ROWS.length),
    };
  }, []);

  const categoryBreakdown = useMemo(() => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500', 'bg-green-500', 'bg-rose-500', 'bg-slate-500'];
    return CATEGORY_NAMES.map((cat, i) => ({
      label: cat,
      count: ALL_ROWS.filter((r) => r.category === cat).reduce((sum, r) => sum + r.amount, 0),
      color: colors[i % colors.length],
    })).sort((a, b) => b.count - a.count);
  }, []);

  // expenseType mirrors the real expense_categories.expense_type field
  // (MARKETING | OPERATIONS | BOTH) — the one authentic "expense type"
  // breakdown the actual schema supports.
  const typeBreakdown = useMemo(() => {
    const colors: Record<string, string> = { Marketing: 'bg-purple-500', Operations: 'bg-blue-500', Both: 'bg-gray-400' };
    return (['Marketing', 'Operations', 'Both'] as const).map((t) => ({
      label: t,
      count: ALL_ROWS.filter((r) => r.expenseType === t).reduce((sum, r) => sum + r.amount, 0),
      color: colors[t],
    })).sort((a, b) => b.count - a.count);
  }, []);

  const departmentBreakdown = useMemo(() => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500'];
    return DEPARTMENTS.map((dept, i) => ({
      label: dept,
      count: ALL_ROWS.filter((r) => r.department === dept).reduce((sum, r) => sum + r.amount, 0),
      color: colors[i % colors.length],
    })).sort((a, b) => b.count - a.count);
  }, []);

  const statusBreakdown = useMemo(() => {
    const colors: Record<ExpenseRow['status'], string> = { Approved: 'bg-green-500', Pending: 'bg-amber-500', Rejected: 'bg-red-500' };
    return STATUSES.map((s) => ({
      label: s,
      count: ALL_ROWS.filter((r) => r.status === s).length,
      color: colors[s],
    })).sort((a, b) => b.count - a.count);
  }, []);

  const columns: Column<ExpenseRow>[] = [
    { header: 'Employee', key: 'employee', render: (r) => <p className="font-semibold text-gray-900">{r.employee}</p> },
    { header: 'Expense', key: 'title' },
    { header: 'Category', key: 'category' },
    { header: 'Amount', key: 'amount', align: 'right', render: (r) => formatCurrency(r.amount) },
    { header: 'Department', key: 'department' },
    { header: 'Date', key: 'date' },
    { header: 'Status', key: 'status', render: (r) => <StatusBadge status={r.status} size="sm" /> },
    { header: 'Approved Date', key: 'approvedDate', render: (r) => r.approvedDate ?? '—' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <KpiRow
        columns={6}
        cards={[
          { icon: Wallet, color: 'bg-blue-500', label: 'Total Expenses', value: formatCurrency(totals.totalAmount) },
          { icon: CheckCircle2, color: 'bg-green-500', label: 'Approved Amount', value: formatCurrency(totals.approvedAmount) },
          { icon: Clock3, color: 'bg-amber-500', label: 'Pending Amount', value: formatCurrency(totals.pendingAmount) },
          { icon: XCircle, color: 'bg-red-500', label: 'Rejected Amount', value: formatCurrency(totals.rejectedAmount) },
          { icon: TrendingUp, color: 'bg-indigo-500', label: 'Average Expense', value: formatCurrency(totals.average) },
          { icon: Hash, color: 'bg-purple-500', label: 'Expense Count', value: totals.count },
        ]}
      />

      <Card className="border-none shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Monthly Expense Trend</p>
          <div className="w-40">
            <SearchableSelect options={MONTH_PERIOD_OPTIONS} value={months} onChange={(v) => setMonths(String(v))} />
          </div>
        </div>
        <TrendChart
          data={trend}
          xKey="month"
          series={[
            { key: 'total', label: 'Total', color: '#2563EB' },
            { key: 'approved', label: 'Approved', color: '#22C55E' },
            { key: 'pending', label: 'Pending', color: '#F59E0B' },
          ]}
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Expense by Category</p>
          <BreakdownList items={categoryBreakdown} unit="$" />
        </Card>
        <Card className="border-none shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Expense by Type</p>
          <BreakdownList items={typeBreakdown} unit="$" />
        </Card>
        <Card className="border-none shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Expense by Department</p>
          <BreakdownList items={departmentBreakdown} unit="$" />
        </Card>
        <Card className="border-none shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Expense by Status</p>
          <BreakdownList items={statusBreakdown} />
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Expense Details</p>
          <ExportMenu
            rows={filteredRows}
            filenamePrefix="Expenses_Report"
            columns={[
              { key: 'employee', label: 'Employee' },
              { key: 'title', label: 'Expense' },
              { key: 'category', label: 'Category' },
              { key: 'expenseType', label: 'Type' },
              { key: 'amount', label: 'Amount' },
              { key: 'department', label: 'Department' },
              { key: 'date', label: 'Date' },
              { key: 'status', label: 'Status' },
              { key: 'submittedDate', label: 'Submitted Date' },
              { key: 'approvedDate', label: 'Approved Date' },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search employee or expense…"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
            />
          </div>
          <div className="w-48">
            <SearchableSelect
              options={CATEGORY_NAMES.map((c) => ({ label: c, value: c }))}
              value={category}
              onChange={(v) => { setCategory(v ? String(v) : ''); setPage(1); }}
              placeholder="All Categories"
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
          emptyMessage="No expenses match your filters."
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

export default ExpensesReport;
