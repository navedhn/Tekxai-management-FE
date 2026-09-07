import React from 'react';
import { cn } from '@/utils/cn';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE_CLASS: Record<BadgeTone, string> = {
  success: 'bg-(--color-success-bg) text-(--color-success) border-(--color-success-border)',
  warning: 'bg-(--color-warning-bg) text-(--color-warning) border-(--color-warning-border)',
  danger: 'bg-(--color-danger-bg) text-(--color-danger) border-(--color-danger-border)',
  info: 'bg-(--color-info-bg) text-(--color-info) border-(--color-info-border)',
  neutral: 'bg-(--color-neutral-bg) text-(--color-neutral) border-(--color-neutral-border)',
};

const STATUS_TONE: Record<string, BadgeTone> = {
  active: 'success',
  present: 'success',
  approved: 'success',
  completed: 'success',
  paid: 'success',
  confirmed: 'success',
  available: 'success',
  permanent: 'success',

  pending: 'warning',
  late: 'warning',
  onleave: 'warning',
  probation: 'warning',
  inreview: 'warning',
  earlyout: 'warning',
  maintenance: 'warning',
  underrepair: 'warning',

  rejected: 'danger',
  cancelled: 'danger',
  absent: 'danger',
  overdue: 'danger',
  failed: 'danger',
  blocked: 'danger',
  terminated: 'danger',
  lost: 'danger',

  leave: 'info',
  inprogress: 'info',
  scheduled: 'info',
  suspended: 'info',
  assigned: 'info',

  inactive: 'neutral',
  draft: 'neutral',
  archived: 'neutral',
  deceased: 'neutral',
  retired: 'neutral',
};

function normalize(status: string): string {
  return status.toLowerCase().replace(/[\s_-]+/g, '');
}

export function toneForStatus(status: string, fallback: BadgeTone = 'neutral'): BadgeTone {
  return STATUS_TONE[normalize(status)] ?? fallback;
}

export interface StatusBadgeProps {

  status?: string;

  tone?: BadgeTone;

  label?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE_CLASS: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-0.5 text-badge',
  md: 'px-2.5 py-1 text-badge',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, tone, label, size = 'md', className }) => {
  const resolvedTone = tone ?? (status ? toneForStatus(status) : 'neutral');
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-bold uppercase tracking-wide whitespace-nowrap',
        TONE_CLASS[resolvedTone],
        SIZE_CLASS[size],
        className,
      )}
    >
      {label ?? status}
    </span>
  );
};

export default StatusBadge;
