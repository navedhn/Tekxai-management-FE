// Pure helpers for the Meeting Management module — mirrors the backend's
// classify_due_date()/sort_timeline_events() in
// be-work/src/modules/meetings/validators/meetings.validation.js so the
// frontend never disagrees with the backend on due-date buckets or ordering.

export type DueBucket = 'NONE' | 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';

export function classifyDueDate(dueDate: string | null | undefined, status: string, now: Date = new Date()): DueBucket {
  if (!dueDate || status === 'COMPLETED') return 'NONE';
  const due = new Date(dueDate);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (due < todayStart) return 'OVERDUE';
  if (due >= todayStart && due < todayEnd) return 'DUE_TODAY';
  return 'UPCOMING';
}

export interface TimelineEventLike {
  created_at: string;
  [key: string]: unknown;
}

export function sortTimelineEvents<T extends TimelineEventLike>(events: T[]): T[] {
  return [...events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

// Forward-only agenda transition rule mirrored from the backend validator —
// used by the UI to decide whether to show the "complete" action at all.
export function canCompleteAgendaItem(status: string): boolean {
  return status !== 'COMPLETED';
}
