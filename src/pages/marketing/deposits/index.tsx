import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  PENDING:   'bg-amber-100 text-amber-700',
  REJECTED:  'bg-red-100 text-red-700',
};

export default function DepositsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['deposits'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.MARKETING.DEPOSITS),
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });

  const deposits: any[] = data || [];

  const now = new Date();
  const thisMonth = deposits.filter((d: any) => {
    const date = new Date(d.date || d.created_at);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const monthTotal = thisMonth.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Deposits</h1>
        <p className="text-sm text-gray-400 mt-0.5">Track received payments and deposits</p>
      </div>

      <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm w-fit">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500">
          <DollarSign size={22} className="text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Deposited This Month</p>
          <p className="text-2xl font-black text-gray-900 leading-tight">PKR {monthTotal.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Amount', 'Source', 'Employee', 'Date', 'Status', 'Reference'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : deposits.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No deposits found</td></tr>
              ) : deposits.map((dep: any) => (
                <tr key={dep.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2 font-black text-gray-900">PKR {Number(dep.amount || 0).toLocaleString()}</td>
                  <td className="py-3 px-2 text-gray-700">{dep.source || dep.payment_method || '—'}</td>
                  <td className="py-3 px-2 text-gray-700">
                    {dep.user?.first_name ? `${dep.user.first_name} ${dep.user.last_name}` : dep.employee_name || '—'}
                  </td>
                  <td className="py-3 px-2 text-gray-500 text-xs whitespace-nowrap">
                    {dep.date || dep.created_at ? new Date(dep.date || dep.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-2">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLE[dep.status] || 'bg-gray-100 text-gray-500')}>
                      {dep.status || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-mono text-xs text-gray-400">{dep.reference || dep.transaction_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
