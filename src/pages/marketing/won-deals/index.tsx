import React, { useMemo, useState } from 'react';
import { Trophy, Search, Download } from 'lucide-react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { Button, pageOutlineButtonClass } from '@/components/ui/Button';
import { MarketingPageHeader, WonDealsStatPills } from '@/components/marketing';
import { useMarketingTeam } from '@/contexts/MarketingTeamContext';
import {
  getWonDeals,
  getWonDealsStats,
  PERIOD_OPTIONS,
} from '@/services/marketingService';
import { WonDeal } from '@/types/marketing';

const SOURCE_OPTIONS = [
  { label: 'All sources', value: 'all' },
  { label: 'Upwork', value: 'Upwork' },
  { label: 'LinkedIn', value: 'LinkedIn' },
];

const SALESPERSON_OPTIONS = [
  { label: 'All salespeople', value: 'all' },
  { label: 'Mohib Ur Rehman', value: 'm1' },
  { label: 'Ayan Rasheed', value: 'm2' },
  { label: 'Mahnoor Abdul Razzaq', value: 'm3' },
  { label: 'Ali Raza', value: 'i1' },
  { label: 'Fatima Noor', value: 'i2' },
];

const WonDealsPage: React.FC = () => {
  const { teamId, teamLabel, period, setPeriod } = useMarketingTeam();
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [salesperson, setSalesperson] = useState('all');
  const [dateRangeEnabled, setDateRangeEnabled] = useState(false);

  const allDeals = useMemo(() => getWonDeals(teamId), [teamId]);
  const stats = useMemo(() => getWonDealsStats(allDeals), [allDeals]);

  const filteredDeals = useMemo(() => {
    const q = search.toLowerCase();
    return allDeals.filter(d => {
      if (source !== 'all' && d.source !== source) return false;
      if (salesperson !== 'all' && d.salespersonId !== salesperson) return false;
      if (q && !d.leadJob.toLowerCase().includes(q) && !d.salespersonName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allDeals, search, source, salesperson]);

  const columns: Column<WonDeal>[] = [
    { header: 'Date', key: 'date' },
    {
      header: 'Salesperson',
      key: 'salespersonName',
      render: item => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[#E4F0FF] text-[#005CDA] flex items-center justify-center text-xs font-bold shrink-0">
            {item.salespersonName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <span className="font-medium text-gray-900">{item.salespersonName}</span>
        </div>
      ),
    },
    {
      header: 'Source',
      key: 'source',
      render: item => (
        <Badge className="bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF] rounded-lg px-2.5 py-1 text-[10px] font-bold">
          {item.source}
        </Badge>
      ),
    },
    {
      header: 'Lead / Job',
      key: 'leadJob',
      render: item => <span className="font-medium text-gray-800 max-w-xs block truncate">{item.leadJob}</span>,
    },
    {
      header: 'Contact',
      key: 'contact',
      render: item => <span className="text-gray-400">{item.contact}</span>,
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

      <WonDealsStatPills {...stats} />

      <Card className="!p-4 sm:!p-5">
        <div className="flex flex-col gap-4">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={dateRangeEnabled}
              onChange={e => setDateRangeEnabled(e.target.checked)}
              className="rounded border-gray-300 text-[#005CDA] focus:ring-[#005CDA]"
            />
            Filter by date range
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select options={SALESPERSON_OPTIONS} value={salesperson} onChange={v => setSalesperson(String(v))} />
            <Select options={SOURCE_OPTIONS} value={source} onChange={v => setSource(String(v))} />
            <Select options={PERIOD_OPTIONS} value={period} onChange={v => setPeriod(String(v))} />
            <Input
              placeholder="Search lead, company, job, link..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={Search}
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              rounded={false}
              leftIcon={Download}
              className={pageOutlineButtonClass}
            >
              Download
            </Button>
          </div>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <Table columns={columns} data={filteredDeals} emptyMessage="No won deals found" />
      </Card>
    </div>
  );
};

export default WonDealsPage;
