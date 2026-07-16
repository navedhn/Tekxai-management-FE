import { describe, it, expect } from 'vitest';
import { classifyDueDate, sortTimelineEvents, canCompleteAgendaItem } from './meetingHelpers';

describe('classifyDueDate', () => {
  const now = new Date('2026-07-16T12:00:00Z');

  it('returns NONE when there is no due date', () => {
    expect(classifyDueDate(null, 'PENDING', now)).toBe('NONE');
  });

  it('returns NONE for a completed item even if the due date has passed', () => {
    expect(classifyDueDate('2026-07-01T00:00:00Z', 'COMPLETED', now)).toBe('NONE');
  });

  it('returns OVERDUE for a past due date', () => {
    expect(classifyDueDate('2026-07-10T00:00:00Z', 'PENDING', now)).toBe('OVERDUE');
  });

  it('returns DUE_TODAY for a due date within today', () => {
    expect(classifyDueDate('2026-07-16T18:00:00Z', 'IN_PROGRESS', now)).toBe('DUE_TODAY');
  });

  it('returns UPCOMING for a future due date', () => {
    expect(classifyDueDate('2026-07-20T00:00:00Z', 'PENDING', now)).toBe('UPCOMING');
  });
});

describe('sortTimelineEvents', () => {
  it('sorts events ascending by created_at (oldest first)', () => {
    const events = [
      { id: 3, created_at: '2026-07-16T10:00:00Z' },
      { id: 1, created_at: '2026-07-14T10:00:00Z' },
      { id: 2, created_at: '2026-07-15T10:00:00Z' },
    ];
    expect(sortTimelineEvents(events).map((e) => e.id)).toEqual([1, 2, 3]);
  });

  it('does not mutate the original array', () => {
    const events = [{ id: 2, created_at: '2026-07-15T10:00:00Z' }, { id: 1, created_at: '2026-07-14T10:00:00Z' }];
    const original = [...events];
    sortTimelineEvents(events);
    expect(events).toEqual(original);
  });
});

describe('canCompleteAgendaItem', () => {
  it('allows completing a PENDING item', () => {
    expect(canCompleteAgendaItem('PENDING')).toBe(true);
  });
  it('allows completing an IN_PROGRESS item', () => {
    expect(canCompleteAgendaItem('IN_PROGRESS')).toBe(true);
  });
  it('does not allow re-completing a COMPLETED item', () => {
    expect(canCompleteAgendaItem('COMPLETED')).toBe(false);
  });
});
