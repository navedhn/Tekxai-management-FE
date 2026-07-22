import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '@/components/ui/Card';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS as ENDPOINTS } from '@/services/api/endpoints';
import { SupportTicket } from '@/types/ticket';
import { TicketDetailModal } from '@/components/tickets';
import PromptModal from '@/components/ui/PromptModal';
import { formatTicketDate } from '@/services/ticketService';
import { Ticket, Search, Clock, CheckCircle2, XCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useDebounce } from '@/hooks/useDebounce';
import { useFetchUsersQuery } from '@/services/userService';
import { useToastContext } from '@/components/toast/ToastProvider';

const v1 = 'api/v1';
const BUILDER = `${v1}/report/builder`;

// Sprint 1 Milestone 6 — Tickets by Category/Type/Priority/Assignee/
// Department, entirely via the generic report_builder aggregate engine.
// SLA Breaches / Average Resolution Time are NOT offered here — see
// report_builder.controller.js's ENTITY_MAP comment: neither is expressible
// via flat filters/single-column aggregates without ticket-specific logic
// inside the generic engine, which this milestone explicitly rules out.
const TICKET_DIMENSIONS = [
  { key: 'priority', label: 'By Priority', group_by: 'priority' },
  { key: 'type', label: 'By Type', group_by: 'ticket_type_id' },
  { key: 'department', label: 'By Department', group_by: 'department_id' },
  { key: 'assignee', label: 'By Assignee', group_by: 'assignee_id' },
];

function TicketReportsSection() {
  const [dimKey, setDimKey] = useState(TICKET_DIMENSIONS[0].key);
  const dimension = TICKET_DIMENSIONS.find((d) => d.key === dimKey)!;
  const { data: users = [] } = useFetchUsersQuery({});

  const aggregateMutation = useMutation({
    mutationFn: (body: any) => apiRequest<any>(`${BUILDER}/aggregate`, { method: 'POST', body: JSON.stringify(body) }).then((r: any) => r?.payload),
  });

  React.useEffect(() => {
    aggregateMutation.mutate({ entity: 'support_tickets', group_by: dimension.group_by });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimKey]);

  const rows = useMemo(() => {
    const raw = aggregateMutation.data?.rows || [];
    return raw.map((r: any) => {
      const value = r[dimension.group_by];
      let label = value ? String(value) : 'Unassigned';
      if (dimKey === 'assignee') { const u = (users as any[]).find((x: any) => x.id === value); label = u ? `${u.first_name} ${u.last_name}` : 'Unassigned'; }
      return { label, count: r.count };
    });
  }, [aggregateMutation.data, dimKey, dimension, users]);

  const max = Math.max(1, ...rows.map((r: any) => r.count));

  return (
    <Card className="border-none shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ticket Breakdown</p>
        <div className="flex gap-1.5 flex-wrap">
          {TICKET_DIMENSIONS.map((d) => (
            <button key={d.key} onClick={() => setDimKey(d.key)} className={cn('px-3 h-8 rounded-lg text-xs font-semibold transition-colors', dimKey === d.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{d.label}</button>
          ))}
        </div>
      </div>
      {aggregateMutation.isPending ? (
        <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No ticket data for this dimension.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r: any, i: number) => (
            <div key={`${r.label}-${i}`} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-600 w-36 truncate">{r.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
              <span className="text-xs font-black text-gray-900 tabular-nums w-8 text-right">{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

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
  const toast = useToastContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [slaOverdueOnly, setSlaOverdueOnly] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [pendingApproval, setPendingApproval] = useState<{ id: string; action: 'APPROVE' | 'REJECT' } | null>(null);
  const [pendingResolveId, setPendingResolveId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading } = useQuery<{ records: SupportTicket[]; total: number }>({
    queryKey: ['tickets', 'admin-list', statusFilter, priorityFilter, debouncedSearch, slaOverdueOnly],
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
      qc.invalidateQueries({ queryKey: ['tickets'] });
      if (selectedTicket) {
        qc.invalidateQueries({ queryKey: ['ticket', selectedTicket.id] });
        qc.invalidateQueries({ queryKey: ['ticket-timeline', selectedTicket.id] });
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to update ticket status.'),
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ id, action, comment }: { id: string; action: 'APPROVE' | 'REJECT'; comment?: string }) => {
      await apiRequest(ENDPOINTS.TICKET.APPROVALS(id), { method: 'POST', body: JSON.stringify({ action, comment: comment || undefined }) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      if (selectedTicket) {
        qc.invalidateQueries({ queryKey: ['ticket', selectedTicket.id] });
        qc.invalidateQueries({ queryKey: ['ticket-timeline', selectedTicket.id] });
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to submit approval decision.'),
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

  // Previously computed by filtering the current paginated `data.records`
  // page (max 100 rows) — wrong once there were more than 100 tickets, since
  // it only counted whatever page happened to be loaded. Now backed by the
  // generic KPI engine's COUNT, which reflects the true total regardless of
  // pagination/filters on the list below.
  const kpiCount = (status: string) =>
    apiRequest<any>(`${BUILDER}/kpi`, { method: 'POST', body: JSON.stringify({ entity: 'support_tickets', metric: 'COUNT', filters: { status } }) }).then((r: any) => r?.payload?.value ?? 0);
  const pendingQ = useQuery({ queryKey: ['ticket-kpi-pending'], queryFn: () => kpiCount('pending') });
  const inProgressQ = useQuery({ queryKey: ['ticket-kpi-in_progress'], queryFn: () => kpiCount('in_progress') });
  const resolvedQ = useQuery({ queryKey: ['ticket-kpi-resolved'], queryFn: () => kpiCount('resolved') });
  const stats = {
    pending: pendingQ.data ?? 0,
    in_progress: inProgressQ.data ?? 0,
    resolved: resolvedQ.data ?? 0,
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

      <TicketReportsSection />

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
                            onClick={() => setPendingApproval({ id: t.id, action: 'APPROVE' })}
                            disabled={approvalMutation.isPending}
                            className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:underline disabled:opacity-50"
                          >
                            <CheckCircle2 size={12} /> Approve
                          </button>
                          <button
                            onClick={() => setPendingApproval({ id: t.id, action: 'REJECT' })}
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
                              if (e.target.value === 'resolved') {
                                setPendingResolveId(t.id);
                              } else {
                                updateMutation.mutate({ id: t.id, status: e.target.value });
                              }
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

      <PromptModal
        isOpen={!!pendingApproval}
        onClose={() => setPendingApproval(null)}
        onConfirm={(comment) => {
          if (pendingApproval) approvalMutation.mutate({ ...pendingApproval, comment });
          setPendingApproval(null);
        }}
        title={pendingApproval?.action === 'APPROVE' ? 'Approve Ticket' : 'Reject Ticket'}
        description="Add an optional comment for this decision."
        placeholder="Comment (optional)…"
        confirmText={pendingApproval?.action === 'APPROVE' ? 'Approve' : 'Reject'}
        loading={approvalMutation.isPending}
      />

      <PromptModal
        isOpen={!!pendingResolveId}
        onClose={() => setPendingResolveId(null)}
        onConfirm={(resolution_note) => {
          if (pendingResolveId) updateMutation.mutate({ id: pendingResolveId, status: 'resolved', resolution_note: resolution_note || undefined });
          setPendingResolveId(null);
        }}
        title="Mark Resolved"
        description="Add an optional resolution note."
        placeholder="Resolution note (optional)…"
        confirmText="Mark Resolved"
        loading={updateMutation.isPending}
      />
    </div>
  );
}
