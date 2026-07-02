import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { formatTrackerTime, useTimeTracker } from './useTimeTracker';
import { API_ENDPOINTS } from '@/services/api/endpoints';

vi.mock('@/components/toast/ToastProvider', () => ({
  useToastContext: () => ({
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

// Tiny fake backend: tracks clocked-in state across calls within a test so
// refreshToday() (called after every action) reflects the real hook's
// actual integration behavior rather than a single canned response.
let fakeClockedIn = false;
let fakeCheckIn: string | null = null;

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn((endpoint: string) => {
    if (endpoint === API_ENDPOINTS.TIMESHEET.CLOCK_IN) {
      fakeClockedIn = true;
      fakeCheckIn = new Date().toISOString();
      return Promise.resolve({ success: true, payload: {} });
    }
    if (endpoint === API_ENDPOINTS.TIMESHEET.CLOCK_OUT) {
      fakeClockedIn = false;
      return Promise.resolve({ success: true, payload: {} });
    }
    if (endpoint === API_ENDPOINTS.TIMESHEET.TODAY) {
      return Promise.resolve({
        success: true,
        payload: fakeClockedIn
          ? { clocked_in: true, clocked_out: false, entry: { check_in: fakeCheckIn, prior_seconds: 0 } }
          : { clocked_in: false, clocked_out: false, entry: null },
      });
    }
    return Promise.resolve({ success: true, payload: {} });
  }),
}));

describe('formatTrackerTime', () => {
  it('formats seconds into h:m:s', () => {
    expect(formatTrackerTime(3661)).toBe('1h:1m:1s');
    expect(formatTrackerTime(0)).toBe('0h:0m:0s');
  });
});

describe('useTimeTracker', () => {
  beforeEach(() => {
    fakeClockedIn = false;
    fakeCheckIn = null;
  });

  it('starts idle and moves to tracking on check-in', async () => {
    const { result } = renderHook(() => useTimeTracker());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.trackerState).toBe('idle');

    await act(async () => {
      await result.current.handleCheckIn();
    });

    expect(result.current.trackerState).toBe('tracking');
  });

  it('resets on check-out', async () => {
    const { result } = renderHook(() => useTimeTracker());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleCheckIn();
    });
    expect(result.current.trackerState).toBe('tracking');

    await act(async () => {
      await result.current.handleCheckOut();
    });

    expect(result.current.trackerState).toBe('idle');
  });
});
