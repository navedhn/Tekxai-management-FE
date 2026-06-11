import React from 'react';
import Badge from '@/components/ui/Badge';
import { TicketStatus } from '@/types/ticket';
import { cn } from '@/utils/cn';

const STATUS_STYLES: Record<TicketStatus, string> = {
  pending: 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]',
  in_progress: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
  resolved: 'bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]',
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

const TicketStatusBadge: React.FC<{ status: TicketStatus; className?: string }> = ({
  status,
  className,
}) => (
  <Badge
    className={cn(
      'rounded-lg px-3 py-1 text-[10px] font-bold capitalize border',
      STATUS_STYLES[status],
      className
    )}
  >
    {STATUS_LABELS[status]}
  </Badge>
);

export default TicketStatusBadge;
