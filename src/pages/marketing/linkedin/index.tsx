import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

const STATUS_STYLE: Record<string, string> = {
  NEW:        'bg-blue-100 text-blue-700',
  CONTACTED:  'bg-purple-100 text-purple-700',
  REPLIED:    'bg-amber-100 text-amber-700',
  MEETING:    'bg-indigo-100 text-indigo-700',
  WON:        'bg-green-100 text-green-700',
  LOST:       'bg-red-100 text-red-700',
};

export default function LinkedInPage() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['linkedin-leads', statusFilter],
    queryFn: () => {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      return apiRequest<any>(`${API_ENDPOINTS.MARKETING.LINKEDIN}${params}`);
    },
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });

  const leads: any[] = data || [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">LinkedIn Leads</h1>
        <p className="text-sm text-gray-400 mt-0.5">Track outreach and connections on LinkedIn</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="mb-4">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm text-gray-600">
            <option value="">All Status</option>
            {['NEW', 'CONTACTED', 'REPLIED', 'MEETING', 'WON', 'LOST'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Company', 'Contact', 'Position', 'Status', 'Date', 'Notes'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : leads.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No LinkedIn leads</td></tr>
              ) : leads.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2 font-semibold text-gray-900">{lead.company || '—'}</td>
                  <td className="py-3 px-2 text-gray-700">{lead.contact_name || lead.name || '—'}</td>
                  <td className="py-3 px-2 text-gray-500">{lead.position || lead.title || '—'}</td>
                  <td className="py-3 px-2">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLE[lead.status] || 'bg-gray-100 text-gray-500')}>
                      {lead.status || 'NEW'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500 text-xs whitespace-nowrap">
                    {lead.date || lead.created_at ? new Date(lead.date || lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-2 text-gray-500 max-w-[160px] truncate">{lead.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
