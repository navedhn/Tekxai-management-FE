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

  // Restore state from backend on mount
  useEffect(() => {
    apiRequest<any>(API_ENDPOINTS.TIMESHEET.TODAY)
      .then((res) => {
        const data = res?.payload || res;
        if (data?.clocked_in && !data?.clocked_out) {
          // Active session — calculate elapsed seconds from check_in
          const checkIn = new Date(data.entry?.check_in).getTime();
          const elapsed = Math.floor((Date.now() - checkIn) / 1000);
          setSeconds(elapsed > 0 ? elapsed : 0);
          setTrackerState('tracking');
        } else if (data?.clocked_in && data?.clocked_out) {
          // Already checked out today
          setSeconds(data.entry?.duration_seconds || 0);
          setTrackerState('idle');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
      setSeconds(0);
      setTrackerState('tracking');
      toast.success("Checked in — time tracking started.");
    } catch (e: any) {
      toast.error(e?.message || 'Failed to check in');
    }
  }, [toast]);

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
      setTrackerState('idle');
      toast.info('Checked out successfully.');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to check out');
    }
  }, [toast]);

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
