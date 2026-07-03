import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, CheckCircle, XCircle, AlertCircle, RefreshCw, Search } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

const TEMPLATES = [
  'OTP', 'INVITE', 'PASSWORD_RESET', 'LEAVE_APPROVED', 'LEAVE_REJECTED',
  'CONTRACT', 'OFFER', 'TASK_ASSIGNED', 'EXPENSE_APPROVED', 'EXPENSE_REJECTED', 'PERFORMANCE_REVIEW',
];

const STATUS_COLORS: Record<string, string> = {
  SENT:    'bg-green-100 text-green-700',
  DEV_LOG: 'bg-blue-100 text-blue-700',
  FAILED:  'bg-red-100 text-red-700',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  SENT:    <CheckCircle size={13} />,
  DEV_LOG: <AlertCircle size={13} />,
  FAILED:  <XCircle size={13} />,
};

function fmt(d: string) {
  return new Date(d).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function EmailLogsPage() {
  const [search, setSearch]     = useState('');
  const [template, setTemplate] = useState('');
  const [status, setStatus]     = useState('');

  const params = new URLSearchParams();
  if (search)   params.set('search', search);
  if (template) params.set('template', template);
  if (status)   params.set('status', status);
  params.set('limit', '200');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['email-logs', search, template, status],
    queryFn:  () => apiRequest<any>(`${API_ENDPOINTS.EMAIL_LOGS}?${params}`),
    select:   (r: any) => r?.payload,
    staleTime: 0,
  });

  const logs: any[] = data?.records || [];
  const total: number = data?.total || 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Email Logs</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">All emails sent from the Tekxai system</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Sent', value: logs.filter(l => l.status === 'SENT').length, color: 'text-green-600' },
          { label: 'Dev Logged', value: logs.filter(l => l.status === 'DEV_LOG').length, color: 'text-blue-600' },
          { label: 'Failed', value: logs.filter(l => l.status === 'FAILED').length, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <Mail size={20} className={s.color} />
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{s.label}</p>
              <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full h-9 pl-8 pr-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
            placeholder="Search by email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white"
          value={template}
          onChange={e => setTemplate(e.target.value)}
        >
          <option value="">All Templates</option>
          {TEMPLATES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select
          className="h-9 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="SENT">Sent</option>
          <option value="DEV_LOG">Dev Log</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-gray-700">
            Email History <span className="text-gray-400 font-semibold">({total})</span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Recipient', 'Subject', 'Template', 'Status', 'Sent At', 'Error'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-3 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Mail size={32} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No email logs found</p>
                  </td>
                </tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2 font-medium text-gray-900">{log.to_email}</td>
                  <td className="py-3 px-2 text-gray-600 max-w-xs truncate">{log.subject}</td>
                  <td className="py-3 px-2">
                    {log.template ? (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-semibold">
                        {log.template.replace(/_/g, ' ')}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-2">
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-600')}>
                      {STATUS_ICONS[log.status]}
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500 text-xs whitespace-nowrap">{fmt(log.sent_at)}</td>
                  <td className="py-3 px-2 text-red-500 text-xs max-w-xs truncate">{log.error || <span className="text-gray-200">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
