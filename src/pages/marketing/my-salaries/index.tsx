import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Download } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

const STATUS_STYLE: Record<string, string> = {
  PAID:    'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  DRAFT:   'bg-gray-100 text-gray-500',
  HOLD:    'bg-red-100 text-red-700',
};

export default function MySalariesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-salaries'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.MARKETING.MY_SALARIES),
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });

  const records: any[] = data || [];

  const totalPaid = records
    .filter((r: any) => r.status === 'PAID')
    .reduce((sum: number, r: any) => sum + (r.net_salary || r.total || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">My Salaries</h1>
          <p className="text-sm text-gray-400 mt-0.5">Your salary history and pay slips</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm w-fit">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500">
          <DollarSign size={22} className="text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Total Paid</p>
          <p className="text-2xl font-black text-gray-900 leading-tight">PKR {totalPaid.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Period', 'Basic', 'Allowances', 'Deductions', 'Net', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">No salary records found</td></tr>
              ) : records.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2 font-semibold text-gray-900">{r.period || r.month || '—'}</td>
                  <td className="py-3 px-2 text-gray-700">PKR {Number(r.basic_salary || r.base_salary || 0).toLocaleString()}</td>
                  <td className="py-3 px-2 text-gray-700">PKR {Number(r.total_allowances || r.allowances || 0).toLocaleString()}</td>
                  <td className="py-3 px-2 text-red-600">PKR {Number(r.total_deductions || r.deductions || 0).toLocaleString()}</td>
                  <td className="py-3 px-2 font-black text-gray-900">PKR {Number(r.net_salary || r.total || 0).toLocaleString()}</td>
                  <td className="py-3 px-2">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-500')}>
                      {r.status || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <button className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Download">
                      <Download size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
