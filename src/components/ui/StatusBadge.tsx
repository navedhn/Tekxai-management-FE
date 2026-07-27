import React from 'react';
import { cn } from '@/utils/cn';

// Design System Phase 11: one reusable badge for status/state labels
// (Active/Inactive/Pending/Approved/Rejected/Completed/Cancelled/Draft/
// Late/Absent/Present/Leave, …) so no page invents its own bg-green-100
// text-green-800 combination. Colors always come from the Phase 2 tokens
// — never pass a custom color, only a semantic `tone` or a recognized
// `status` string. Existing Badge.tsx and its call sites are untouched;
// this is a new, additive component for status-shaped badges specifically.

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE_CLASS: Record<BadgeTone, string> = {
  success: 'bg-(--color-success-bg) text-(--color-success) border-(--color-success-border)',
  warning: 'bg-(--color-warning-bg) text-(--color-warning) border-(--color-warning-border)',
  danger: 'bg-(--color-danger-bg) text-(--color-danger) border-(--color-danger-border)',
  info: 'bg-(--color-info-bg) text-(--color-info) border-(--color-info-border)',
  neutral: 'bg-(--color-neutral-bg) text-(--color-neutral) border-(--color-neutral-border)',
};

// Canonical status → tone mapping. Lookup is case-insensitive and
// tolerant of underscores/spaces (e.g. "in_progress", "In Progress").
const STATUS_TONE: Record<string, BadgeTone> = {
  active: 'success',
  present: 'success',
  approved: 'success',
  completed: 'success',
  paid: 'success',
  confirmed: 'success',

  pending: 'warning',
  late: 'warning',
  onleave: 'warning',
  probation: 'warning',
  inreview: 'warning',

  rejected: 'danger',
  cancelled: 'danger',
  absent: 'danger',
  overdue: 'danger',
  failed: 'danger',
  blocked: 'danger',

  leave: 'info',
  inprogress: 'info',
  scheduled: 'info',

  inactive: 'neutral',
  draft: 'neutral',
  archived: 'neutral',
};

function normalize(status: string): string {
  return status.toLowerCase().replace(/[\s_-]+/g, '');
}

export function toneForStatus(status: string, fallback: BadgeTone = 'neutral'): BadgeTone {
  return STATUS_TONE[normalize(status)] ?? fallback;
}

export interface StatusBadgeProps {
  /** A recognized status string (e.g. "Active", "pending", "in_progress"). Its tone is looked up automatically. */
  status?: string;
  /** Explicit tone override — use when `status` isn't one of the recognized labels, or to force a specific color. */
  tone?: BadgeTone;
  /** Display label; defaults to `status` as-is if omitted. */
  label?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE_CLASS: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-0.5 text-badge',
  md: 'px-2.5 py-1 text-badge',
};

/** Status/state badge — colors are always derived from a tone, never hardcoded. */
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
