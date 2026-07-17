import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

// Attendance policy: Check In / Check Out can ONLY be triggered from the
// TekXAI Desktop Monitoring Agent (so screenshots, productivity tracking,
// idle detection, and monitoring all stay consistent with a single source
// of truth). This hook is READ-ONLY — it polls today's attendance status
// for display purposes only and must never call the clock-in/clock-out
// endpoints from the web UI.
export type TrackerState = 'idle' | 'tracking';

export function formatTrackerTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h:${m}m:${s}s`;
}

export function useTimeTracker() {
  const [trackerState, setTrackerState] = useState<TrackerState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Read-only status fetch — reflects whatever the desktop agent has
  // recorded for today. Never writes/mutates attendance state.
  const refreshToday = useCallback(() => {
    return apiRequest<any>(API_ENDPOINTS.TIMESHEET.TODAY)
      .then((res) => {
        const data = res?.payload || res;
        if (data?.clocked_in && !data?.clocked_out) {
          // Active session (started from the desktop app) — tick forward
          // from the check-in time + any prior session seconds today.
          const checkIn = new Date(data.entry?.check_in).getTime();
          const elapsed = Math.floor((Date.now() - checkIn) / 1000);
          const priorSeconds = data.entry?.prior_seconds || 0;
          setSeconds(priorSeconds + (elapsed > 0 ? elapsed : 0));
          setTrackerState('tracking');
        } else if (data?.clocked_in && data?.clocked_out) {
          // Already checked out for the day — show the completed total.
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
    // Poll periodically so the web view stays in sync with the desktop
    // agent's check-in/check-out actions without requiring a page refresh.
    const poll = setInterval(refreshToday, 60_000);
    return () => clearInterval(poll);
  }, [refreshToday]);

  // Tick the displayed timer while an active desktop-app session is running.
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
