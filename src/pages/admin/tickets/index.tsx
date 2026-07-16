import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS as ENDPOINTS } from '@/services/api/endpoints';
import { SupportTicket } from '@/types/ticket';
import { TicketDetailModal } from '@/components/tickets';
import { formatTicketDate } from '@/services/ticketService';
import { Ticket, Search, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useDebounce } from '@/hooks/useDebounce';

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved:    'bg-green-100 text-green-700',
};
const PRIORITY_STYLES: Record<string, string> = {
  low:    'bg-gray-100 text-gray-600',
  medium: 'bg-orange-100 text-orange-600',
  high:   'bg-red-100 text-red-700',
};

export default function AdminTickets() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [slaOverdueOnly, setSlaOverdueOnly] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading } = useQuery<{ records: SupportTicket[]; total: number }>({
    queryKey: ['admin-tickets', statusFilter, priorityFilter, debouncedSearch, slaOverdueOnly],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (slaOverdueOnly) params.set('sla', 'overdue');
      const res = await apiRequest<any>(`${ENDPOINTS.TICKET.LIST}?${params}`);
      return res?.payload;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, resolution_note }: { id: string; status: string; resolution_note?: string }) => {
      await apiRequest(ENDPOINTS.TICKET.UPDATE(id), { method: 'PATCH', body: JSON.stringify({ status, resolution_note }) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
      qc.invalidateQueries({ queryKey: ['tickets', 'stats'] });
      if (selectedTicket) qc.invalidateQueries({ queryKey: ['ticket', selectedTicket.id] });
    },
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) => {
      const comment = prompt(`${action === 'APPROVE' ? 'Approval' : 'Rejection'} comment (optional):`) || undefined;
      await apiRequest(ENDPOINTS.TICKET.APPROVALS(id), { method: 'POST', body: JSON.stringify({ action, comment }) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
      if (selectedTicket) qc.invalidateQueries({ queryKey: ['ticket', selectedTicket.id] });
    },
  });

  // Search is now server-side (subject/description/ticket number) — the list
  // is exactly what the backend returned.
  const tickets = data?.records ?? [];

  // A service-desk ticket at an approval-gated workflow step gets
  // Approve/Reject actions instead of a free status dropdown.
  const currentStep = (t: SupportTicket) =>
    t.typeSnapshot?.workflow?.find((s) => s.key === t.status);
  const nextSteps = (t: SupportTicket) => {
    const wf = t.typeSnapshot?.workflow;
    if (!wf) return null; // legacy ticket — free statuses
    const idx = wf.findIndex((s) => s.key === t.status);
    return wf.filter((_, i) => i !== idx);
  };

  const stats = {
    pending:     (data?.records ?? []).filter(t => t.status === 'pending').length,
    in_progress: (data?.records ?? []).filter(t => t.status === 'in_progress').length,
    resolved:    (data?.records ?? []).filter(t => t.status === 'resolved').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Ticket size={24} className="text-[#005CDA]" /> Support Tickets
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and respond to employee support tickets.</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'pending',     label: 'Pending',     cls: 'bg-yellow-50 text-yellow-700' },
          { key: 'in_progress', label: 'In Progress', cls: 'bg-blue-50 text-blue-700'    },
          { key: 'resolved',    label: 'Resolved',    cls: 'bg-green-50 text-green-700'  },
        ].map(({ key, label, cls }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(prev => prev === key ? 'all' : key)}
            className={cn('rounded-2xl p-5 text-left transition-all', cls, statusFilter === key ? 'ring-2 ring-offset-2 ring-current' : '')}
          >
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
            <p className="text-4xl font-black mt-1 tabular-nums">{stats[key as keyof typeof stats]}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ticket #, subject, or employee…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005CDA]/30"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005CDA]/30"
        >
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button
          type="button"
          onClick={() => setSlaOverdueOnly((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 text-sm font-semibold border rounded-xl px-3 py-2 transition-colors',
            slaOverdueOnly
              ? 'bg-red-50 text-red-600 border-red-200'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300',
          )}
        >
          <Clock size={14} />
          SLA Overdue
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading tickets…</div>
        ) : tickets.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No tickets found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Ticket #', 'Subject', 'Employee', 'Recipient', 'Priority', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-[#005CDA] text-xs">{t.ticketNumber}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 max-w-[180px] truncate">{t.subject}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{t.createdBy}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{t.recipientName}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full capitalize', PRIORITY_STYLES[t.priority] || '')}>{t.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full capitalize', STATUS_STYLES[t.status] || '')}>{t.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatTicketDate(t.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedTicket(t)}
                        className="text-xs font-semibold text-[#005CDA] hover:underline"
                      >
                        View / Reply
                      </button>
                      {currentStep(t)?.requires_approval ? (
                        // Approval-gated workflow step — status can only move via approve/reject
                        <>
                          <button
                            onClick={() => approvalMutation.mutate({ id: t.id, action: 'APPROVE' })}
                            disabled={approvalMutation.isPending}
                            className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:underline disabled:opacity-50"
                          >
                            <CheckCircle2 size={12} /> Approve
                          </button>
                          <button
                            onClick={() => approvalMutation.mutate({ id: t.id, action: 'REJECT' })}
                            disabled={approvalMutation.isPending}
                            className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </>
                      ) : nextSteps(t) ? (
                        // Service-desk ticket — statuses come from its workflow snapshot
                        !t.closedAt && (
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (!e.target.value) return;
                              updateMutation.mutate({ id: t.id, status: e.target.value });
                              e.target.value = '';
                            }}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                          >
                            <option value="" disabled>Change status</option>
                            {nextSteps(t)!.map((s) => (
                              <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                          </select>
                        )
                      ) : (
                        // Legacy ticket — original free-status behavior
                        t.status !== 'resolved' && (
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const resolution_note = e.target.value === 'resolved' ? prompt('Resolution note (optional):') || undefined : undefined;
                              updateMutation.mutate({ id: t.id, status: e.target.value, resolution_note });
                              e.target.value = '';
                            }}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                          >
                            <option value="" disabled>Change status</option>
                            {t.status !== 'in_progress' && <option value="in_progress">Mark In Progress</option>}
                            <option value="resolved">Mark Resolved</option>
                          </select>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <TicketDetailModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        isAdmin
      />
    </div>
  );
}
