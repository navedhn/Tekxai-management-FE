import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { QUERY_KEYS } from '@/services/api/tanstackKeys';

export type TrackerState = 'idle' | 'tracking';

export function formatTrackerTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h:${String(m).padStart(2, '0')}m:${String(s).padStart(2, '0')}s`;
}

function deriveTracker(data: any): { trackerState: TrackerState; seconds: number } {
  if (!data) return { trackerState: 'idle', seconds: 0 };

  if (data.clocked_in && !data.clocked_out) {
    const checkIn = new Date(data.entry?.check_in).getTime();
    // Prefer server_now so a skewed OS clock (e.g. +12h) cannot inflate
    // the live timer; fall back to Date.now() for older backends.
    const serverNowMs = data.server_now ? new Date(data.server_now).getTime() : NaN;
    const nowMs = Number.isFinite(serverNowMs) ? serverNowMs : Date.now();
    const elapsed = Math.max(0, Math.floor((nowMs - checkIn) / 1000));
    const priorSeconds = data.entry?.prior_seconds || 0;
    return { trackerState: 'tracking', seconds: priorSeconds + elapsed };
  }

  if (data.clocked_in && data.clocked_out) {
    return { trackerState: 'idle', seconds: data.entry?.duration_seconds || 0 };
  }

  return { trackerState: 'idle', seconds: 0 };
}

async function fetchToday() {
  try {
    const res = await apiRequest<any>(API_ENDPOINTS.TIMESHEET.TODAY);
    return res?.payload || res;
  } catch {
    // Preserve previous silent-fail behavior for the read-only tracker.
    return null;
  }
}

export function useTimeTracker() {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.TIMESHEET.TODAY,
    queryFn: fetchToday,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: false,
  });

  const derived = deriveTracker(data);
  const [trackerState, setTrackerState] = useState<TrackerState>(derived.trackerState);
  const [seconds, setSeconds] = useState(derived.seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const next = deriveTracker(data);
    setTrackerState(next.trackerState);
    setSeconds(next.seconds);
  }, [data]);

  useEffect(() => {
    if (trackerState === 'tracking') {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [trackerState]);

  return {
    trackerState,
    seconds,
    loading: isLoading,
  };
}
