import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { formatTrackerTime, useTimeTracker } from './useTimeTracker';

vi.mock('@/components/toast/ToastProvider', () => ({
  useToastContext: () => ({
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('formatTrackerTime', () => {
  it('formats seconds into h:m:s', () => {
    expect(formatTrackerTime(3661)).toBe('1h:1m:1s');
    expect(formatTrackerTime(0)).toBe('0h:0m:0s');
  });
});

describe('useTimeTracker', () => {
  it('starts idle and moves to tracking on check-in', () => {
    const { result } = renderHook(() => useTimeTracker(0));

    expect(result.current.trackerState).toBe('idle');

    act(() => {
      result.current.handleCheckIn();
    });

    expect(result.current.trackerState).toBe('tracking');
  });

  it('resets on check-out', () => {
    const { result } = renderHook(() => useTimeTracker(5));

    act(() => {
      result.current.handleCheckIn();
      result.current.handleCheckOut();
    });

    expect(result.current.trackerState).toBe('idle');
    expect(result.current.seconds).toBe(0);
  });
});
