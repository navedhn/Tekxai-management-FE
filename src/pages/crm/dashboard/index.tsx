import React from 'react';
import { useGetCRMDashboard } from '@/services/crmService';
import Card from '@/components/ui/Card';
import { Briefcase, Linkedin, Mail, DollarSign, TrendingUp, Flame, Trophy } from 'lucide-react';

const fmt_usd = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);

const fmt_date = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

interface ChannelCardProps {
  icon: React.ReactNode;
  label: string;
  total: number;
  won: number;
  active: number;
  won_value: number;
  color: string;
}

const ChannelCard: React.FC<ChannelCardProps> = ({ icon, label, total, won, active, won_value, color }) => (
  <Card className="p-6 flex flex-col gap-4 shadow-sm border border-gray-100 rounded-2xl">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <span className="font-black text-gray-800 text-sm">{label}</span>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div className="text-center">
        <div className="text-2xl font-black text-gray-900">{total}</div>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-black text-blue-600">{active}</div>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-black text-green-600">{won}</div>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Won</div>
      </div>
    </div>
    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
      <span className="text-xs text-gray-500 font-bold">Won Revenue</span>
      <span className="text-sm font-black text-green-600">{fmt_usd(won_value)}</span>
    </div>
    {total > 0 && (
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-green-500"
          style={{ width: `${Math.min(100, (won / total) * 100)}%` }}
        />
      </div>
    )}
  </Card>
);

const CRMDashboard: React.FC = () => {
  const { data, isLoading } = useGetCRMDashboard();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-xl w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const d = data;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">CRM Pipeline Dashboard</h1>
        <p className="text-sm text-gray-500 font-medium">Real-time view of your sales pipeline across all channels.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1">Total Leads</div>
          <div className="text-3xl font-black text-gray-900">{d?.pipeline_summary.total_leads ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">across all channels</div>
        </Card>
        <Card className="p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1">Won Revenue</div>
          <div className="text-3xl font-black text-green-600">{fmt_usd(d?.pipeline_summary.total_won_value ?? 0)}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">lifetime value</div>
        </Card>
        <Card className="p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1">This Month Deposits</div>
          <div className="text-3xl font-black text-blue-600">{fmt_usd(d?.deposits_this_month ?? 0)}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">cash received</div>
        </Card>
        <Card className="p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1">Hot Leads</div>
          <div className="text-3xl font-black text-orange-500">
            {(d?.hot_leads.upwork.length ?? 0) + (d?.hot_leads.linkedin.length ?? 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1 font-medium">marked as hot</div>
        </Card>
      </div>

      {/* Channel Cards */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-500 mb-4">Pipeline by Channel</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChannelCard
            icon={<Briefcase size={20} className="text-orange-500" />}
            label="Upwork Bids"
            color="bg-orange-50"
            total={d?.upwork.total ?? 0}
            won={d?.upwork.won ?? 0}
            active={d?.upwork.active ?? 0}
            won_value={d?.upwork.won_value ?? 0}
          />
          <ChannelCard
            icon={<Linkedin size={20} className="text-blue-600" />}
            label="LinkedIn Leads"
            color="bg-blue-50"
            total={d?.linkedin.total ?? 0}
            won={d?.linkedin.won ?? 0}
            active={d?.linkedin.active ?? 0}
            won_value={d?.linkedin.won_value ?? 0}
          />
          <ChannelCard
            icon={<Mail size={20} className="text-purple-600" />}
            label="Email Leads"
            color="bg-purple-50"
            total={d?.email.total ?? 0}
            won={d?.email.won ?? 0}
            active={d?.email.active ?? 0}
            won_value={d?.email.won_value ?? 0}
          />
        </div>
      </div>

      {/* Hot Leads + Recent Won side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hot Leads */}
        <Card className="p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={18} className="text-orange-500" />
            <h3 className="text-sm font-black text-gray-800">Hot Leads</h3>
          </div>
          {[...(d?.hot_leads.upwork ?? []), ...(d?.hot_leads.linkedin ?? [])].length === 0 ? (
            <p className="text-sm text-gray-400 font-medium text-center py-6">No hot leads right now.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {[...(d?.hot_leads.upwork ?? []).map((l: any) => ({ ...l, _src: 'Upwork' })),
                ...(d?.hot_leads.linkedin ?? []).map((l: any) => ({ ...l, _src: 'LinkedIn' }))]
                .slice(0, 8)
                .map((lead: any) => (
                  <div key={lead.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="text-sm font-bold text-gray-800">{lead.job_title || lead.full_name || 'Unnamed Lead'}</div>
                      <div className="text-xs text-gray-400 font-medium">{lead._src} · {lead.client_name || lead.status}</div>
                    </div>
                    {lead.contract_amount && (
                      <span className="text-xs font-black text-green-600">{fmt_usd(lead.contract_amount)}</span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </Card>

        {/* Recent Won Deals */}
        <Card className="p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-yellow-500" />
            <h3 className="text-sm font-black text-gray-800">Recent Won Deals</h3>
          </div>
          {(d?.recent_won ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 font-medium text-center py-6">No recent deals.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {(d?.recent_won ?? []).map((deal: any) => (
                <div key={deal.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-bold text-gray-800">{deal.lead_job}</div>
                    <div className="text-xs text-gray-400 font-medium">
                      {deal.salesperson?.first_name} {deal.salesperson?.last_name} · {fmt_date(deal.date)} · {deal.source}
                    </div>
                  </div>
                  <span className="text-xs font-black text-green-600">{fmt_usd(deal.revenue_usd)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CRMDashboard;
