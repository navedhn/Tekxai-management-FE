import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import TicketStatusBadge from './TicketStatusBadge';
import { SupportTicket, TicketReply } from '@/types/ticket';
import { formatTicketDate, useTicketTimelineQuery } from '@/services/ticketService';
import { API_ENDPOINTS as ENDPOINTS } from '@/services/api/endpoints';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Send, User, ShieldCheck, Clock, CheckCircle2, XCircle, History } from 'lucide-react';

interface TicketDetailModalProps {
  ticket: SupportTicket | null;
  onClose: () => void;
  isAdmin?: boolean;
}

const ReplyBubble: React.FC<{ reply: TicketReply }> = ({ reply }) => {
  const name = reply.user ? `${reply.user.first_name} ${reply.user.last_name}` : 'Unknown';
  return (
    <div className={`flex gap-3 ${reply.is_admin_reply ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${reply.is_admin_reply ? 'bg-[#005CDA]' : 'bg-gray-200'}`}>
        {reply.is_admin_reply
          ? <ShieldCheck size={14} className="text-white" />
          : <User size={14} className="text-gray-500" />
        }
      </div>
      <div className={`max-w-[80%] ${reply.is_admin_reply ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <span className="text-[10px] font-bold text-gray-400">{name}</span>
        <div className={`rounded-xl px-3 py-2 text-sm ${reply.is_admin_reply ? 'bg-[#005CDA] text-white' : 'bg-gray-100 text-gray-800'}`}>
          {reply.message}
        </div>
        <span className="text-[10px] text-gray-400">{formatTicketDate(reply.created_at)}</span>
      </div>
    </div>
  );
};

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, onClose, isAdmin = false }) => {
  const [message, setMessage] = useState('');
  const qc = useQueryClient();

  const { data: fullTicket } = useQuery<SupportTicket>({
    queryKey: ['ticket', ticket?.id],
    queryFn: async () => {
      const res = await apiRequest<any>(ENDPOINTS.TICKET.DETAIL(ticket!.id));
      return res?.payload;
    },
    enabled: !!ticket?.id,
    initialData: ticket ?? undefined,
  });

  const replyMutation = useMutation({
    mutationFn: async (msg: string) => {
      const res = await apiRequest<any>(ENDPOINTS.TICKET.REPLIES(ticket!.id), { method: 'POST', body: JSON.stringify({ message: msg }) });
      return res?.payload;
    },
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['ticket', ticket!.id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const { data: timeline = [] } = useTicketTimelineQuery(ticket?.id);

  if (!ticket) return null;
  const t = fullTicket ?? ticket;
  const replies = t.replies ?? [];
  const approvals = t.approvals ?? [];

  // Flatten the type snapshot's field schema so custom field values can be
  // shown with their configured labels (in schema order).
  const customFieldRows: { label: string; value: string }[] = [];
  for (const section of t.typeSnapshot?.field_schema || []) {
    for (const f of section.fields || []) {
      const v = t.customFields?.[f.key];
      if (v !== undefined && v !== null && v !== '') {
        customFieldRows.push({ label: f.label, value: Array.isArray(v) ? v.join(', ') : String(v) });
      }
    }
  }

  const slaChip = (label: string, due?: string | null) => {
    if (!due) return null;
    const overdue = !t.closedAt && new Date(due) < new Date();
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${
        overdue ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
      }`}>
        <Clock size={11} />
        {label} {overdue ? 'overdue since' : 'due'} {formatTicketDate(due)}
      </span>
    );
  };

  return (
    <Modal
      isOpen={!!ticket}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-[#005CDA]">{t.ticketNumber}</span>
          <span>{t.subject}</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <TicketStatusBadge status={t.status} />
          <span className="text-xs font-semibold text-gray-500 capitalize">Priority: {t.priority}</span>
          {t.severity && <span className="text-xs font-semibold text-gray-500 capitalize">Severity: {t.severity}</span>}
          {t.ticketType && (
            <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-[#005CDA]">
              {t.ticketType.category?.label ? `${t.ticketType.category.label} / ` : ''}{t.ticketType.label}
            </span>
          )}
          {slaChip('Response', t.responseDueAt)}
          {slaChip('Resolution', t.resolutionDueAt)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Raised to</p>
            <p className="font-semibold text-gray-900 mt-1">{t.recipientName}</p>
            <p className="text-xs text-gray-500">{t.recipientLabel}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Created</p>
            <p className="font-semibold text-gray-900 mt-1">{formatTicketDate(t.createdAt)}</p>
            {t.createdBy && <p className="text-xs text-gray-500">{t.createdBy}</p>}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">{t.description}</p>
        </div>

        {/* Custom fields from the ticket type's dynamic form */}
        {customFieldRows.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Request details</p>
            <div className="rounded-xl border border-gray-100 divide-y divide-gray-100 text-sm">
              {customFieldRows.map((r) => (
                <div key={r.label} className="flex justify-between px-4 py-2">
                  <span className="text-gray-400 font-semibold">{r.label}</span>
                  <span className="font-semibold text-gray-900 text-right max-w-[60%]">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(t.assignee || t.team) && (
          <div className="flex flex-wrap gap-4 text-sm">
            {t.assignee && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Assignee</p>
                <p className="font-semibold text-gray-900">{t.assignee.first_name} {t.assignee.last_name}</p>
              </div>
            )}
            {t.team && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Team</p>
                <p className="font-semibold text-gray-900">{t.team.name}</p>
              </div>
            )}
          </div>
        )}

        {/* Approval history */}
        {approvals.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Approvals</p>
            <div className="space-y-2">
              {approvals.map((a) => (
                <div key={a.id} className="flex items-start gap-2 text-sm">
                  {a.action === 'APPROVE'
                    ? <CheckCircle2 size={15} className="text-green-500 mt-0.5 shrink-0" />
                    : <XCircle size={15} className="text-red-500 mt-0.5 shrink-0" />}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {a.approver ? `${a.approver.first_name} ${a.approver.last_name}` : 'Approver'}
                      <span className="text-gray-400 font-normal"> {a.action === 'APPROVE' ? 'approved' : 'rejected'} at stage "{a.stage}"</span>
                    </p>
                    {a.comment && <p className="text-xs text-gray-500">{a.comment}</p>}
                    <p className="text-[10px] text-gray-400">{formatTicketDate(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {t.status === 'resolved' && (
          <div className="rounded-xl border border-[#ABEFC6] bg-[#ECFDF3] p-4">
            <p className="text-[10px] font-bold text-[#067647] uppercase tracking-wide mb-1">
              Resolved{t.resolvedAt && ` · ${formatTicketDate(t.resolvedAt)}`}
            </p>
            <p className="text-sm text-gray-700">{t.resolutionNote || 'This ticket has been marked as resolved.'}</p>
          </div>
        )}

        {/* Activity timeline — served straight from activity_logs */}
        {timeline.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
              <History size={11} /> Timeline
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {timeline.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-gray-700">{entry.description || entry.action}</p>
                    <p className="text-[10px] text-gray-400">
                      {entry.user ? `${entry.user.first_name} ${entry.user.last_name} · ` : ''}{formatTicketDate(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Replies thread */}
        {replies.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Conversation</p>
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {replies.map((r) => <ReplyBubble key={r.id} reply={r} />)}
            </div>
          </div>
        )}

        {/* Reply input — always visible */}
        {t.status !== 'resolved' && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
              {isAdmin ? 'Reply to employee' : 'Add message'}
            </p>
            <div className="flex gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && message.trim()) replyMutation.mutate(message); }}
                placeholder="Type your message… (Ctrl+Enter to send)"
                rows={2}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#005CDA]/30"
              />
              <button
                disabled={!message.trim() || replyMutation.isPending}
                onClick={() => replyMutation.mutate(message)}
                className="self-end px-4 py-2 rounded-xl bg-[#005CDA] text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                <Send size={14} />
                {replyMutation.isPending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TicketDetailModal;
