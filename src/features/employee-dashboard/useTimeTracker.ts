import { useCallback, useEffect, useState } from 'react';
import { useToastContext } from '@/components/toast/ToastProvider';

export type TrackerState = 'idle' | 'tracking' | 'paused';

export function formatTrackerTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h:${m}m:${s}s`;
}

export function useTimeTracker(initialSeconds = 10) {
  const toast = useToastContext();
  const [trackerState, setTrackerState] = useState<TrackerState>('idle');
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (trackerState !== 'tracking') return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [trackerState]);

  const handleCheckIn = useCallback(() => {
    setTrackerState('tracking');
    toast.success("Tracker Started For Today's Task..");
  }, [toast]);

  const handleBreak = useCallback(() => {
    setTrackerState('paused');
    toast.warning('Tracker Paused For Break..');
  }, [toast]);

  const handleResume = useCallback(() => {
    setTrackerState('tracking');
    toast.success("Tracker Started For Today's Task..");
  }, [toast]);

  const handleCheckOut = useCallback(() => {
    setTrackerState('idle');
    setSeconds(0);
    toast.info('Successfully Checked Out');
  }, [toast]);

  return {
    trackerState,
    seconds,
    handleCheckIn,
    handleBreak,
    handleResume,
    handleCheckOut,
  };
}
