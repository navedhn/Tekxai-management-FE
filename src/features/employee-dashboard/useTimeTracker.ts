import { useCallback, useEffect, useRef, useState } from 'react';
import { useToastContext } from '@/components/toast/ToastProvider';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

export type TrackerState = 'idle' | 'tracking' | 'paused';

export function formatTrackerTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h:${m}m:${s}s`;
}

export function useTimeTracker() {
  const toast = useToastContext();
  const [trackerState, setTrackerState] = useState<TrackerState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore state from backend
  const refreshToday = useCallback(() => {
    return apiRequest<any>(API_ENDPOINTS.TIMESHEET.TODAY)
      .then((res) => {
        const data = res?.payload || res;
        if (data?.clocked_in && !data?.clocked_out) {
          // Active session — resume ticking from prior sessions today + elapsed
          const checkIn = new Date(data.entry?.check_in).getTime();
          const elapsed = Math.floor((Date.now() - checkIn) / 1000);
          const priorSeconds = data.entry?.prior_seconds || 0;
          setSeconds(priorSeconds + (elapsed > 0 ? elapsed : 0));
          setTrackerState('tracking');
        } else if (data?.clocked_in && data?.clocked_out) {
          // Not currently clocked in — show today's cumulative total
          setSeconds(data.entry?.duration_seconds || 0);
          setTrackerState('idle');
        } else {
          setSeconds(0);
          setTrackerState('idle');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshToday().finally(() => setLoading(false));
  }, [refreshToday]);

  // Tick while tracking
  useEffect(() => {
    if (trackerState === 'tracking') {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [trackerState]);

  const handleCheckIn = useCallback(async () => {
    try {
      await apiRequest(API_ENDPOINTS.TIMESHEET.CLOCK_IN, { method: 'POST', body: JSON.stringify({}) });
      await refreshToday();
      toast.success("Checked in — time tracking started.");
    } catch (e: any) {
      toast.error(e?.message || 'Failed to check in');
    }
  }, [toast, refreshToday]);

  const handleBreak = useCallback(() => {
    setTrackerState('paused');
    toast.warning('Tracker paused for break.');
  }, [toast]);

  const handleResume = useCallback(() => {
    setTrackerState('tracking');
    toast.success('Tracker resumed.');
  }, [toast]);

  const handleCheckOut = useCallback(async () => {
    try {
      await apiRequest(API_ENDPOINTS.TIMESHEET.CLOCK_OUT, { method: 'POST', body: JSON.stringify({}) });
      await refreshToday();
      toast.info('Checked out successfully.');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to check out');
    }
  }, [toast, refreshToday]);

  return {
    trackerState,
    seconds,
    loading,
    handleCheckIn,
    handleBreak,
    handleResume,
    handleCheckOut,
  };
}
