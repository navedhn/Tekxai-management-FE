import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, DollarSign, BarChart2, Activity } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

function StatCard({ icon: Icon, color, label, value, sub }: any) {
  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function MyReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-report'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.MARKETING.MY_REPORT),
    select: (r: any) => r?.payload,
  });

  const deals: any[] = data?.deals || data?.recent_deals || [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">My Report</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your personal performance overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp}  color="bg-blue-500"   label="Deals This Month"   value={data?.deals_this_month ?? data?.total_deals} />
        <StatCard icon={DollarSign}  color="bg-green-500"  label="Revenue"            value={data?.revenue ? `PKR ${Number(data.revenue).toLocaleString()}` : '—'} />
        <StatCard icon={BarChart2}   color="bg-purple-500" label="Conversion Rate"    value={data?.conversion_rate ? `${data.conversion_rate}%` : '—'} />
        <StatCard icon={Activity}    color="bg-amber-500"  label="Activities"         value={data?.activities ?? data?.total_activities} />
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        </div>
      ) : deals.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-black text-gray-800 mb-4">Recent Deals</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Deal / Project', 'Value', 'Status', 'Date', 'Source'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deals.map((deal: any) => (
                  <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-semibold text-gray-900">{deal.title || deal.name || '—'}</td>
                    <td className="py-3 px-2 text-gray-700 font-semibold">
                      {deal.value || deal.amount ? `PKR ${Number(deal.value || deal.amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-2">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                        deal.status === 'WON' ? 'bg-green-100 text-green-700' :
                        deal.status === 'LOST' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700')}>
                        {deal.status || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-500 text-xs whitespace-nowrap">
                      {deal.date || deal.created_at ? new Date(deal.date || deal.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td className="py-3 px-2 text-gray-500">{deal.source || deal.platform || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
