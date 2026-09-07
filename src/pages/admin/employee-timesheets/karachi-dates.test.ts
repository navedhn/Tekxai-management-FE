import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toDateStr, startOfWeek, addDays, startOfMonth, resolveSummaryRange } from './index';

describe('Karachi-anchored date helpers (admin/employee-timesheets)', () => {
  let original_tz: string | undefined;

  beforeEach(() => {
    original_tz = process.env.TZ;
  });

  afterEach(() => {
    process.env.TZ = original_tz;
  });

  it('toDateStr resolves to the Karachi calendar day, not the browser/process timezone', () => {
    process.env.TZ = 'America/Los_Angeles';

    const instant = new Date('2026-09-04T02:00:00.000Z');
    expect(toDateStr(instant)).toBe('2026-09-04');
  });

  it('startOfWeek returns the Monday of the Karachi week containing the given instant', () => {
    process.env.TZ = 'America/Los_Angeles';

    const friday = new Date('2026-09-04T10:00:00.000Z');
    const monday = startOfWeek(friday);
    expect(toDateStr(monday)).toBe('2026-08-31');
  });

  it('addDays performs exact 24h steps regardless of local DST/timezone quirks', () => {
    const d = new Date('2026-09-04T02:00:00.000Z');
    expect(toDateStr(addDays(d, 1))).toBe('2026-09-05');
    expect(toDateStr(addDays(d, -1))).toBe('2026-09-03');
  });

  it('startOfMonth resolves to the 1st of the Karachi month, with offset for previous months', () => {
    process.env.TZ = 'Pacific/Kiritimati';
    const mid_month = new Date('2026-09-15T02:00:00.000Z');
    expect(toDateStr(startOfMonth(mid_month))).toBe('2026-09-01');
    expect(toDateStr(startOfMonth(mid_month, -1))).toBe('2026-08-01');
  });

  it('resolveSummaryRange("today") matches Karachi "today" even from a browser many hours behind', () => {
    process.env.TZ = 'America/Los_Angeles';
    const range = resolveSummaryRange('today', '', '');
    const karachi_today = toDateStr(new Date());
    expect(range.start).toBe(karachi_today);
    expect(range.end).toBe(karachi_today);
  });

  it('resolveSummaryRange("this_week") start is always a Karachi Monday', () => {
    process.env.TZ = 'America/Los_Angeles';
    const range = resolveSummaryRange('this_week', '', '');
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', weekday: 'short' }).format(new Date(`${range.start}T12:00:00Z`));
    expect(weekday).toBe('Mon');
  });

  it('resolveSummaryRange("last_month") end date is the last day of the Karachi previous month, never crossing into the current month', () => {
    process.env.TZ = 'America/Los_Angeles';
    const range = resolveSummaryRange('last_month', '', '');
    const this_month_start = toDateStr(startOfMonth(new Date()));
    expect(range.end < this_month_start).toBe(true);
  });
});
