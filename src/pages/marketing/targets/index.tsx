import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Target } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

export default function TargetsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['targets'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.MARKETING.TARGETS),
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });

  const targets: any[] = data || [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Targets</h1>
        <p className="text-sm text-gray-400 mt-0.5">Track monthly and quarterly targets</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Period', 'Target', 'Achieved', 'Progress', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : targets.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">No targets found</td></tr>
              ) : targets.map((t: any) => {
                const targetAmt = t.target_amount || t.target || 0;
                const achieved = t.achieved_amount || t.achieved || 0;
                const pct = targetAmt > 0 ? Math.min(100, Math.round((achieved / targetAmt) * 100)) : 0;

                return (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-semibold text-gray-900">{t.period || t.month || '—'}</td>
                    <td className="py-3 px-2 text-gray-700 font-semibold">PKR {Number(targetAmt).toLocaleString()}</td>
                    <td className="py-3 px-2 text-gray-700">PKR {Number(achieved).toLocaleString()}</td>
                    <td className="py-3 px-2 w-[200px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-400' : 'bg-blue-500')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-gray-700 w-10 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                        pct >= 100 ? 'bg-green-100 text-green-700' :
                        pct >= 70 ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700')}>
                        {pct >= 100 ? 'Achieved' : pct >= 70 ? 'On Track' : 'Behind'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
