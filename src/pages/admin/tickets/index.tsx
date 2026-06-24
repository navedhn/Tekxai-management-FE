import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/services/api/axiosInstance';
import { ENDPOINTS } from '@/services/api/endpoints';
import { SupportTicket } from '@/types/ticket';
import { TicketDetailModal } from '@/components/tickets';
import { formatTicketDate } from '@/services/ticketService';
import { Ticket, Search, Filter } from 'lucide-react';
import { cn } from '@/utils/cn';

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
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const { data, isLoading } = useQuery<{ records: SupportTicket[]; total: number }>({
    queryKey: ['admin-tickets', statusFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      const res = await axiosInstance.get(`${ENDPOINTS.TICKET.LIST}?${params}`);
      return res.data.payload;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, resolution_note }: { id: string; status: string; resolution_note?: string }) => {
      await axiosInstance.patch(ENDPOINTS.TICKET.UPDATE(id), { status, resolution_note });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
      qc.invalidateQueries({ queryKey: ['tickets', 'stats'] });
      if (selectedTicket) qc.invalidateQueries({ queryKey: ['ticket', selectedTicket.id] });
    },
  });

  const tickets = (data?.records ?? []).filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.ticketNumber?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q) ||
      t.createdBy?.toLowerCase().includes(q)
    );
  });

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
                      {t.status !== 'resolved' && (
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
