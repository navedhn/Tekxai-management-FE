import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, DollarSign, TrendingUp, BarChart2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

function StatCard({ icon: Icon, color, label, value }: any) {
  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-tight">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function MarketingHRDashboardPage() {
  const { data } = useQuery({
    queryKey: ['crm-dashboard'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.CRM_WORKSPACE.DASHBOARD),
    select: (r: any) => r?.payload,
  });

  const { data: salaries } = useQuery({
    queryKey: ['marketing-salary-history'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.MARKETING.SALARY_HISTORY),
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });

  const salaryList: any[] = salaries || [];
  const totalPayroll = salaryList.reduce((s: number, r: any) => s + (r.net_salary || r.total || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">HR Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Team overview and payroll summary</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}     color="bg-blue-500"   label="Team Size"        value={data?.team_size ?? data?.total_members} />
        <StatCard icon={DollarSign} color="bg-green-500" label="Total Payroll"    value={totalPayroll ? `PKR ${Math.round(totalPayroll).toLocaleString()}` : '—'} />
        <StatCard icon={TrendingUp} color="bg-purple-500" label="Won This Month"  value={data?.won_this_month ?? data?.deals_won} />
        <StatCard icon={BarChart2}  color="bg-amber-500"  label="Pipeline Value"  value={data?.pipeline_value ? `PKR ${Number(data.pipeline_value).toLocaleString()}` : '—'} />
      </div>

      {salaryList.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-black text-gray-800 mb-4">Team Salary Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Member', 'Period', 'Basic', 'Net Salary', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {salaryList.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-semibold text-gray-900">
                      {r.user?.first_name} {r.user?.last_name}
                    </td>
                    <td className="py-3 px-2 text-gray-500 text-xs">{r.period || r.month || '—'}</td>
                    <td className="py-3 px-2 text-gray-700">PKR {Number(r.basic_salary || r.base_salary || 0).toLocaleString()}</td>
                    <td className="py-3 px-2 font-black text-gray-900">PKR {Number(r.net_salary || r.total || 0).toLocaleString()}</td>
                    <td className="py-3 px-2">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                        r.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                        {r.status || 'PENDING'}
                      </span>
                    </td>
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
