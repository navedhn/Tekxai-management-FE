import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  MarketingPageHeader,
  PayrollMetricCard,
  PayrollMetricValue,
  PayrollStatusList,
} from '@/components/marketing';
import { useMarketingTeam } from '@/contexts/MarketingTeamContext';
import {
  formatPkr,
  formatUsd,
  getPayrollSummary,
  getTeamMembers,
  PERIOD_OPTIONS,
} from '@/services/marketingService';
import { TeamMember } from '@/types/marketing';
import { cn } from '@/utils/cn';

const MarketingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { teamId, teamLabel, period, setPeriod } = useMarketingTeam();
  const [search, setSearch] = useState('');

  const members = useMemo(() => getTeamMembers(teamId), [teamId]);
  const payroll = useMemo(() => getPayrollSummary(teamId, period), [teamId, period]);

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter(
      m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [members, search]);

  const columns: Column<TeamMember>[] = [
    {
      header: 'Name',
      key: 'name',
      render: item => <span className="font-semibold text-gray-900">{item.name}</span>,
    },
    { header: 'Role', key: 'role' },
    { header: 'Month', key: 'month' },
    {
      header: 'Status',
      key: 'status',
      render: item => {
        if (!item.status) return <span className="text-gray-400">—</span>;
        const styles: Record<string, string> = {
          published: 'bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]',
          draft: 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]',
          pending: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
        };
        return (
          <Badge className={cn('rounded-lg px-3 py-1 text-[10px] font-bold capitalize border', styles[item.status])}>
            {item.status}
          </Badge>
        );
      },
    },
    {
      header: 'Total (PKR)',
      key: 'totalPkr',
      render: item =>
        item.totalPkr != null ? (
          <span className="font-semibold tabular-nums">{formatPkr(item.totalPkr)}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: item => (
        <Button
          size="sm"
          animation="none"
          rounded={false}
          className="rounded-lg text-xs font-bold h-9 px-3 bg-[#005CDA] text-white border-0 hover:bg-[#0047AB] shadow-none hover:shadow-md hover:-translate-y-0"
          onClick={() => navigate(`/marketing/salary-builder/${item.id}`)}
        >
          <Plus size={14} />
          Create Salary
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <MarketingPageHeader title="HR Dashboard" showTeamSwitcher />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900">
            Payroll · {period.split(' ')[0]} {period.split(' ')[1]}
          </h2>
          <p className="text-sm text-gray-500 font-medium">Showing {teamLabel}</p>
        </div>
        <div className="w-full sm:w-44">
          <Select
            options={PERIOD_OPTIONS}
            value={period}
            onChange={v => setPeriod(String(v))}
            placeholder="Select month"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <PayrollMetricCard title="Salaries This Month" accent="blue">
          <PayrollStatusList
            items={[
              { label: 'Published', count: payroll.published, color: 'text-[#067647]' },
              { label: 'Drafts', count: payroll.drafts, color: 'text-[#C4320A]' },
              { label: 'Pending', count: payroll.pending, color: 'text-[#005CDA]' },
            ]}
          />
        </PayrollMetricCard>
        <PayrollMetricCard title="Total Payroll (Published)" accent="green">
          <PayrollMetricValue
            accent="green"
            value={formatPkr(payroll.totalPayrollPkr)}
            subtext={`${formatUsd(payroll.totalPayrollUsd)} USD`}
          />
        </PayrollMetricCard>
        <PayrollMetricCard title="Commission Paid" accent="blue">
          <PayrollMetricValue
            value={formatPkr(payroll.commissionPkr)}
            subtext={`${formatUsd(payroll.commissionUsd)} USD`}
          />
        </PayrollMetricCard>
        <PayrollMetricCard title="Deductions" accent="orange">
          <PayrollMetricValue accent="orange" value={formatPkr(payroll.deductionsPkr)} />
        </PayrollMetricCard>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">Team Members</h2>
          <div className="w-full sm:max-w-xs">
            <Input
              placeholder="Search by name or email"
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={Search}
            />
          </div>
        </div>
        <div className="px-2 pb-2">
          <Table
            columns={columns}
            data={filteredMembers}
            emptyMessage="No team members found"
            className="border-0 shadow-none"
          />
        </div>
      </Card>
    </div>
  );
};

export default MarketingDashboard;
