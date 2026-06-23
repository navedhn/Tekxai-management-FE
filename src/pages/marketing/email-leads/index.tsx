import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

const STATUS_STYLE: Record<string, string> = {
  NEW:      'bg-blue-100 text-blue-700',
  REPLIED:  'bg-amber-100 text-amber-700',
  FOLLOW_UP:'bg-purple-100 text-purple-700',
  WON:      'bg-green-100 text-green-700',
  LOST:     'bg-red-100 text-red-700',
};

export default function EmailLeadsPage() {
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['email-leads'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.MARKETING.EMAIL_LEADS),
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });

  const leads: any[] = (data || []).filter((l: any) =>
    !q || l.subject?.toLowerCase().includes(q.toLowerCase()) ||
    l.sender?.toLowerCase().includes(q.toLowerCase()) ||
    l.contact_name?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Email Leads</h1>
        <p className="text-sm text-gray-400 mt-0.5">Track inbound email inquiries and leads</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="relative mb-4 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
            placeholder="Search leads…" value={q} onChange={e => setQ(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Subject / Title', 'Sender / Contact', 'Status', 'Date', 'Notes'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : leads.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">No email leads found</td></tr>
              ) : leads.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2">
                    <p className="font-semibold text-gray-900 max-w-[220px] truncate">{lead.subject || lead.title || '—'}</p>
                  </td>
                  <td className="py-3 px-2">
                    <p className="text-gray-700">{lead.sender || lead.contact_name || lead.name || '—'}</p>
                    {lead.email && <p className="text-xs text-gray-400">{lead.email}</p>}
                  </td>
                  <td className="py-3 px-2">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLE[lead.status] || 'bg-gray-100 text-gray-500')}>
                      {lead.status || 'NEW'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500 text-xs whitespace-nowrap">
                    {lead.date || lead.received_at || lead.created_at
                      ? new Date(lead.date || lead.received_at || lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
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
