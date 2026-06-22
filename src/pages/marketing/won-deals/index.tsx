import React, { useMemo, useState } from 'react';
import { Trophy, Search, Download } from 'lucide-react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MarketingPageHeader, WonDealsStatPills } from '@/components/marketing';
import { useMarketingTeam } from '@/contexts/MarketingTeamContext';
import { PERIOD_OPTIONS } from '@/services/marketingService';
import { useGetWonDealsLeads } from '@/services/leadsService';

const SOURCE_OPTIONS = [
  { label: 'All sources', value: 'all' },
  { label: 'Upwork', value: 'Upwork' },
  { label: 'LinkedIn', value: 'LinkedIn' },
];

const WonDealsPage: React.FC = () => {
  const { teamId, teamLabel, period, setPeriod } = useMarketingTeam();
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [dateRangeEnabled, setDateRangeEnabled] = useState(false);

  const { data, isLoading } = useGetWonDealsLeads();
  const allDeals: any[] = data?.records || [];

  const filteredDeals = useMemo(() => {
    const q = search.toLowerCase();
    return allDeals.filter(d => {
      if (source !== 'all' && d.source !== source) return false;
      const jobTitle = d.job_title || d.full_name || '';
      if (q && !jobTitle.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allDeals, search, source]);

  const stats = useMemo(() => {
    const totalRevenue = filteredDeals.reduce((s: number, d: any) => s + (d.contract_amount || 0), 0);
    const totalDeals = filteredDeals.length;
    return {
      totalDeals,
      totalRevenue,
      avgDealSize: totalDeals > 0 ? totalRevenue / totalDeals : 0,
      upworkCount: filteredDeals.filter((d: any) => d.source === 'Upwork').length,
      linkedInCount: filteredDeals.filter((d: any) => d.source === 'LinkedIn').length,
    };
  }, [filteredDeals]);

  const columns: Column<any>[] = [
    {
      header: 'Date', key: 'date',
      render: item => <span className="text-sm text-gray-600">{item.date ? new Date(item.date).toLocaleDateString() : '—'}</span>,
    },
    {
      header: 'Salesperson', key: 'user',
      render: item => {
        const name = item.user ? `${item.user.first_name} ${item.user.last_name}` : '—';
        return (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#E4F0FF] text-[#005CDA] flex items-center justify-center text-xs font-bold shrink-0">
              {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <span className="font-medium text-gray-900">{name}</span>
          </div>
        );
      },
    },
    {
      header: 'Source', key: 'source',
      render: item => (
        <Badge className="bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF] rounded-lg px-2.5 py-1 text-[10px] font-bold">
          {item.source || '—'}
        </Badge>
      ),
    },
    {
      header: 'Lead / Job', key: 'job_title',
      render: item => <span className="font-medium text-gray-800 max-w-xs block truncate">{item.job_title || item.full_name || '—'}</span>,
    },
    {
      header: 'Contract', key: 'contract_amount',
      render: item => item.contract_amount ? <span className="font-semibold text-green-700">${item.contract_amount.toLocaleString()}</span> : <span className="text-gray-400">—</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <MarketingPageHeader
        title="Won Deals"
        showTeamSwitcher
        backTo="/marketing"
      />

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#ECFDF3] flex items-center justify-center">
          <Trophy size={20} className="text-[#067647]" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Won Deals</h2>
          <p className="text-sm text-gray-500 font-medium">All Won Deals · {teamLabel}</p>
        </div>
      </div>

      <WonDealsStatPills totalDeals={stats.totalDeals} totalRevenue={stats.totalRevenue} avgDealSize={stats.avgDealSize} upworkCount={stats.upworkCount} linkedInCount={stats.linkedInCount} />

      <Card className="!p-4 sm:!p-5">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Select options={SOURCE_OPTIONS} value={source} onChange={v => setSource(String(v))} />
            <Select options={PERIOD_OPTIONS} value={period} onChange={v => setPeriod(String(v))} />
            <Input
              placeholder="Search lead, company, job..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={Search}
            />
          </div>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <Table columns={columns} data={filteredDeals} loading={isLoading} emptyMessage="No won deals found" />
      </Card>
    </div>
  );
};

export default WonDealsPage;
