import React from 'react';
import Modal from '@/components/ui/Modal';
import TicketStatusBadge from './TicketStatusBadge';
import { SupportTicket } from '@/types/ticket';
import { formatTicketDate } from '@/services/ticketService';

interface TicketDetailModalProps {
  ticket: SupportTicket | null;
  onClose: () => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, onClose }) => {
  if (!ticket) return null;

  return (
    <Modal
      isOpen={!!ticket}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-[#005CDA]">{ticket.ticketNumber}</span>
          <span>{ticket.subject}</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          <span className="text-xs font-semibold text-gray-500 capitalize">
            Priority: {ticket.priority}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Raised to</p>
            <p className="font-semibold text-gray-900 mt-1">{ticket.recipientName}</p>
            <p className="text-xs text-gray-500">{ticket.recipientLabel}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Created</p>
            <p className="font-semibold text-gray-900 mt-1">{formatTicketDate(ticket.createdAt)}</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">{ticket.description}</p>
        </div>

        {ticket.status === 'resolved' && (
          <div className="rounded-xl border border-[#ABEFC6] bg-[#ECFDF3] p-4">
            <p className="text-[10px] font-bold text-[#067647] uppercase tracking-wide mb-1">
              Resolved
              {ticket.resolvedAt && ` · ${formatTicketDate(ticket.resolvedAt)}`}
            </p>
            <p className="text-sm text-gray-700">
              {ticket.resolutionNote || 'This ticket has been marked as resolved.'}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TicketDetailModal;
