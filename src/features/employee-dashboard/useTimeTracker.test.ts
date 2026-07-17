import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { formatTrackerTime, useTimeTracker } from './useTimeTracker';
import { API_ENDPOINTS } from '@/services/api/endpoints';

// Attendance policy: Check In / Check Out only happens via the desktop
// agent. useTimeTracker is READ-ONLY — these tests assert it never calls
// the clock-in/clock-out endpoints and only reflects whatever status the
// backend (populated by the desktop agent) reports.
let fakeToday: any = { clocked_in: false, clocked_out: false, entry: null };
const apiRequestMock = vi.fn((endpoint: string) => {
  if (endpoint === API_ENDPOINTS.TIMESHEET.TODAY) {
    return Promise.resolve({ success: true, payload: fakeToday });
  }
  return Promise.resolve({ success: true, payload: {} });
});

vi.mock('@/lib/queryClient', () => ({
  apiRequest: (...args: any[]) => (apiRequestMock as any)(...args),
}));

describe('formatTrackerTime', () => {
  it('formats seconds into h:m:s', () => {
    expect(formatTrackerTime(3661)).toBe('1h:1m:1s');
    expect(formatTrackerTime(0)).toBe('0h:0m:0s');
  });
});

describe('useTimeTracker (read-only — no check-in/check-out capability)', () => {
  beforeEach(() => {
    apiRequestMock.mockClear();
    fakeToday = { clocked_in: false, clocked_out: false, entry: null };
  });

  it('never exposes a check-in or check-out handler', () => {
    const { result } = renderHook(() => useTimeTracker());
    expect((result.current as any).handleCheckIn).toBeUndefined();
    expect((result.current as any).handleCheckOut).toBeUndefined();
    expect((result.current as any).handleBreak).toBeUndefined();
    expect((result.current as any).handleResume).toBeUndefined();
  });

  it('shows idle when the desktop agent has not checked the user in', async () => {
    const { result } = renderHook(() => useTimeTracker());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.trackerState).toBe('idle');
    expect(result.current.seconds).toBe(0);
  });

  it('reflects an active session started by the desktop agent (read-only)', async () => {
    fakeToday = {
      clocked_in: true,
      clocked_out: false,
      entry: { check_in: new Date().toISOString(), prior_seconds: 100 },
    };
    const { result } = renderHook(() => useTimeTracker());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.trackerState).toBe('tracking');
    expect(result.current.seconds).toBeGreaterThanOrEqual(100);
  });

  it('shows completed total once the desktop agent has checked the user out', async () => {
    fakeToday = { clocked_in: true, clocked_out: true, entry: { duration_seconds: 28800 } };
    const { result } = renderHook(() => useTimeTracker());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.trackerState).toBe('idle');
    expect(result.current.seconds).toBe(28800);
  });

  it('only ever calls the read-only TIMESHEET.TODAY endpoint, never clock-in/clock-out', async () => {
    const { result } = renderHook(() => useTimeTracker());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const calledEndpoints = apiRequestMock.mock.calls.map((c) => c[0]);
    expect(calledEndpoints.every((e) => e === API_ENDPOINTS.TIMESHEET.TODAY)).toBe(true);
    expect(calledEndpoints).not.toContain(API_ENDPOINTS.TIMESHEET.CLOCK_IN);
    expect(calledEndpoints).not.toContain(API_ENDPOINTS.TIMESHEET.CLOCK_OUT);
  });
});
