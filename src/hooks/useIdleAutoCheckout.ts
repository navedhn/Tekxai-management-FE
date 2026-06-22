/**
 * Browser-session idle detection for attendance auto-checkout.
 *
 * IMPORTANT — architecture honesty note:
 * This hook detects inactivity WITHIN the browser tab/window only.
 * It CANNOT detect OS-level idle (user working in Figma, VS Code, terminal etc.)
 * For true device-wide idle detection, a desktop companion agent is required.
 * See Layer 2 design in the implementation notes.
 *
 * What it does detect:
 * - No mouse movement, keydown, click, scroll, or touchstart in this browser tab
 * - Page visibility (hidden tab resets activity — ensures tab being hidden
 *   doesn't incorrectly keep the session alive)
 *
 * Flow:
 * 1. User checks in → hook starts watching
 * 2. No activity for IDLE_TIMEOUT_MS → POST /timesheet/force-checkout?reason=IDLE_TIMEOUT
 * 3. Set localStorage flag → on next tab focus or page load the modal fires
 *
 * The hook is mounted once in the root layout (e.g. EmployeeLayout or App root)
 * only when the user is authenticated and has an active clock-in session.
 */

import { useEffect, useRef } from 'react';
import { forceCheckoutApi, setIdleCheckoutFlag } from '@/utils/attendanceAutoCheckout';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
] as const;

interface UseIdleAutoCheckoutOptions {
  /** Whether the user currently has an active (clocked-in, not clocked-out) session */
  isClockdIn: boolean;
  /** Called immediately after the auto-checkout fires so the parent can update state */
  onAutoCheckout?: () => void;
}

export function useIdleAutoCheckout({ isClockdIn, onAutoCheckout }: UseIdleAutoCheckoutOptions) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didCheckout = useRef(false);

  useEffect(() => {
    if (!isClockdIn) {
      // Not clocked in — clear any pending timer and reset
      if (timer.current) clearTimeout(timer.current);
      didCheckout.current = false;
      return;
    }

    didCheckout.current = false;

    const resetTimer = () => {
      if (didCheckout.current) return; // already checked out this session
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        if (didCheckout.current) return;
        didCheckout.current = true;
        setIdleCheckoutFlag();
        await forceCheckoutApi('IDLE_TIMEOUT');
        onAutoCheckout?.();
      }, IDLE_TIMEOUT_MS);
    };

    // Start the timer immediately
    resetTimer();

    // Reset on any user activity
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));

    // When tab becomes visible again after being hidden, reset the idle timer
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') resetTimer();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isClockdIn, onAutoCheckout]);
}
