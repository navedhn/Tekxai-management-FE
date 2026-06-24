import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import TicketStatusBadge from './TicketStatusBadge';
import { SupportTicket, TicketReply } from '@/types/ticket';
import { formatTicketDate } from '@/services/ticketService';
import { ENDPOINTS } from '@/services/api/endpoints';
import axiosInstance from '@/services/api/axiosInstance';
import { useAuth } from '@/hooks/useAuth';
import { Send, User, ShieldCheck } from 'lucide-react';

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
      const res = await axiosInstance.get(ENDPOINTS.TICKET.DETAIL(ticket!.id));
      return res.data.payload;
    },
    enabled: !!ticket?.id,
    initialData: ticket ?? undefined,
  });

  const replyMutation = useMutation({
    mutationFn: async (msg: string) => {
      const res = await axiosInstance.post(ENDPOINTS.TICKET.REPLIES(ticket!.id), { message: msg });
      return res.data.payload;
    },
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['ticket', ticket!.id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  if (!ticket) return null;
  const t = fullTicket ?? ticket;
  const replies = t.replies ?? [];

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

        {t.status === 'resolved' && (
          <div className="rounded-xl border border-[#ABEFC6] bg-[#ECFDF3] p-4">
            <p className="text-[10px] font-bold text-[#067647] uppercase tracking-wide mb-1">
              Resolved{t.resolvedAt && ` · ${formatTicketDate(t.resolvedAt)}`}
            </p>
            <p className="text-sm text-gray-700">{t.resolutionNote || 'This ticket has been marked as resolved.'}</p>
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
