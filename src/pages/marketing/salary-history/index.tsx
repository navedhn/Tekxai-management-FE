import React, { useMemo, useState } from 'react';
import { Search, Pencil, FileDown } from 'lucide-react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MarketingPageHeader } from '@/components/marketing';
import { useMarketingTeam } from '@/contexts/MarketingTeamContext';
import { formatPkr, getSalaryHistory, PERIOD_OPTIONS } from '@/services/marketingService';
import { SalaryHistoryRecord } from '@/types/marketing';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';

const STATUS_OPTIONS = [
  { label: 'All status', value: 'all' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
];

const SalaryHistoryPage: React.FC = () => {
  const { teamId, teamLabel } = useMarketingTeam();
  const toast = useToastContext();
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const records = useMemo(() => getSalaryHistory(teamId), [teamId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter(r => {
      if (periodFilter !== 'all' && r.period !== periodFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (q && !r.employeeName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [records, search, periodFilter, statusFilter]);

  const columns: Column<SalaryHistoryRecord>[] = [
    {
      header: 'Employee',
      key: 'employeeName',
      render: item => <span className="font-semibold text-gray-900">{item.employeeName}</span>,
    },
    { header: 'Period', key: 'period' },
    {
      header: 'Basic (PKR)',
      key: 'basicPkr',
      render: item => <span className="tabular-nums">{formatPkr(item.basicPkr)}</span>,
    },
    {
      header: 'Commission (PKR)',
      key: 'commissionPkr',
      render: item => <span className="tabular-nums">{formatPkr(item.commissionPkr)}</span>,
    },
    {
      header: 'Deductions (PKR)',
      key: 'deductionsPkr',
      render: item => (
        <span className="tabular-nums text-red-600 font-semibold">{formatPkr(item.deductionsPkr)}</span>
      ),
    },
    {
      header: 'Grand Total',
      key: 'grandTotalPkr',
      render: item => (
        <span className="tabular-nums text-[#067647] font-black">{formatPkr(item.grandTotalPkr)}</span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: item => (
        <Badge
          className={cn(
            'rounded-lg px-3 py-1 text-[10px] font-bold capitalize border',
            item.status === 'published'
              ? 'bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]'
              : 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]'
          )}
        >
          {item.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: () => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            animation="none"
            rounded={false}
            size="sm"
            className="rounded-lg text-xs h-8 px-2.5"
            onClick={() => toast.info('Edit will be available when backend is connected.')}
          >
            <Pencil size={13} />
            Edit
          </Button>
          <Button
            variant="outline"
            animation="none"
            rounded={false}
            size="sm"
            className="rounded-lg text-xs h-8 px-2.5"
            onClick={() => toast.info('PDF download will be available when backend is connected.')}
          >
            <FileDown size={13} />
            PDF
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <MarketingPageHeader
        title={`Salary History · ${teamLabel}`}
        subtitle="All salary slips created for this team."
        showTeamSwitcher
      />

      <Card className="!p-4 sm:!p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search by employee name"
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={Search}
          />
          <Select
            options={[{ label: 'All periods', value: 'all' }, ...PERIOD_OPTIONS]}
            value={periodFilter}
            onChange={v => setPeriodFilter(String(v))}
          />
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={v => setStatusFilter(String(v))}
          />
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <Table columns={columns} data={filtered} emptyMessage="No salary records found" />
      </Card>
    </div>
  );
};

export default SalaryHistoryPage;
