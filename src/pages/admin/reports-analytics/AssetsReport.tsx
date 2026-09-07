import React, { useMemo, useState } from 'react';
import { Package, UserCheck2, PackageCheck, Wrench, Trash2, Search } from 'lucide-react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import SearchableSelect from '@/components/ui/SearchableSelect';
import StatusBadge from '@/components/ui/StatusBadge';
import { KpiRow } from './components/KpiRow';
import { DonutBreakdown } from './components/DonutBreakdown';
import { BreakdownList } from './components/BreakdownList';
import { ExportMenu } from './components/ExportMenu';
import { DEPARTMENTS, generateAssetRows, type AssetRow } from './mockData';

const PAGE_SIZE = 8;
const CATEGORIES: AssetRow['category'][] = ['Laptop', 'Monitor', 'Mobile', 'Accessories', 'Other'];

const ALL_ROWS = generateAssetRows(55);

function statusTone(status: AssetRow['status']) {
  return status === 'Disposed' ? 'neutral' : undefined;
}

export const AssetsReport: React.FC = () => {
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    return ALL_ROWS.filter((r) => {
      if (category && r.category !== category) return false;
      if (department && r.department !== department) return false;
      if (status && r.status !== status) return false;
      if (search && !r.asset.toLowerCase().includes(search.toLowerCase()) && !r.assetCode.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [category, department, status, search]);

  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(() => ({
    total: ALL_ROWS.length,
    assigned: ALL_ROWS.filter((r) => r.status === 'Assigned').length,
    available: ALL_ROWS.filter((r) => r.status === 'Available').length,
    maintenance: ALL_ROWS.filter((r) => r.status === 'Maintenance').length,
    disposed: ALL_ROWS.filter((r) => r.status === 'Disposed').length,
  }), []);

  const statusDonut = useMemo(() => ([
    { label: 'Assigned', value: totals.assigned },
    { label: 'Available', value: totals.available },
    { label: 'Maintenance', value: totals.maintenance },
    { label: 'Disposed', value: totals.disposed },
  ]), [totals]);

  const categoryBreakdown = useMemo(() => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-cyan-500'];
    return CATEGORIES.map((cat, i) => ({
      label: cat,
      count: ALL_ROWS.filter((r) => r.category === cat).length,
      color: colors[i % colors.length],
    })).sort((a, b) => b.count - a.count);
  }, []);

  const columns: Column<AssetRow>[] = [
    { header: 'Asset', key: 'asset', render: (r) => <p className="font-semibold text-gray-900">{r.asset}</p> },
    { header: 'Category', key: 'category' },
    { header: 'Asset Code', key: 'assetCode' },
    { header: 'Assigned To', key: 'assignedTo', render: (r) => r.assignedTo ?? '—' },
    { header: 'Department', key: 'department', render: (r) => r.department ?? '—' },
    { header: 'Status', key: 'status', render: (r) => <StatusBadge status={r.status} tone={statusTone(r.status)} size="sm" /> },
    { header: 'Assigned Date', key: 'assignedDate', render: (r) => r.assignedDate ?? '—' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <KpiRow
        cards={[
          { icon: Package, color: 'bg-blue-500', label: 'Total Assets', value: totals.total },
          { icon: UserCheck2, color: 'bg-indigo-500', label: 'Assigned', value: totals.assigned, subtext: `${Math.round((totals.assigned / totals.total) * 100)}% of total` },
          { icon: PackageCheck, color: 'bg-green-500', label: 'Available', value: totals.available, subtext: `${Math.round((totals.available / totals.total) * 100)}% of total` },
          { icon: Wrench, color: 'bg-amber-500', label: 'Under Repair', value: totals.maintenance },
          { icon: Trash2, color: 'bg-gray-500', label: 'Disposed', value: totals.disposed },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Asset Overview</p>
          <DonutBreakdown data={statusDonut} total={totals.total} totalLabel="Assets" />
        </Card>

        <Card className="border-none shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Assets by Category</p>
          <BreakdownList items={categoryBreakdown} />
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Asset Details</p>
          <ExportMenu
            rows={filteredRows}
            filenamePrefix="Assets_Report"
            columns={[
              { key: 'asset', label: 'Asset' },
              { key: 'category', label: 'Category' },
              { key: 'assetCode', label: 'Asset Code' },
              { key: 'assignedTo', label: 'Assigned To' },
              { key: 'department', label: 'Department' },
              { key: 'status', label: 'Status' },
              { key: 'assignedDate', label: 'Assigned Date' },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search asset or code…"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
            />
          </div>
          <div className="w-44">
            <SearchableSelect
              options={CATEGORIES.map((c) => ({ label: c, value: c }))}
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
          <div className="w-44">
            <SearchableSelect
              options={['Assigned', 'Available', 'Maintenance', 'Disposed'].map((s) => ({ label: s, value: s }))}
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
          emptyMessage="No assets match your filters."
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

export default AssetsReport;
