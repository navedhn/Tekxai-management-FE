import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

export type TrackerState = 'idle' | 'tracking';

export function formatTrackerTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h:${String(m).padStart(2, '0')}m:${String(s).padStart(2, '0')}s`;
}

export function useTimeTracker() {
  const [trackerState, setTrackerState] = useState<TrackerState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshToday = useCallback(() => {
    return apiRequest<any>(API_ENDPOINTS.TIMESHEET.TODAY)
      .then((res) => {
        const data = res?.payload || res;
        if (data?.clocked_in && !data?.clocked_out) {

          const checkIn = new Date(data.entry?.check_in).getTime();

          const elapsed = Math.max(0, Math.floor((Date.now() - checkIn) / 1000));
          const priorSeconds = data.entry?.prior_seconds || 0;
          setSeconds(priorSeconds + elapsed);
          setTrackerState('tracking');
        } else if (data?.clocked_in && data?.clocked_out) {

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

    const poll = setInterval(refreshToday, 60_000);
    return () => clearInterval(poll);
  }, [refreshToday]);

  useEffect(() => {
    if (trackerState === 'tracking') {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [trackerState]);

  return {
    trackerState,
    seconds,
    loading,
  };
}
