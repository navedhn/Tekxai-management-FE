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

const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

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
  /** Idle timeout in milliseconds. Defaults to 15 minutes if not provided. */
  idleTimeoutMs?: number;
}

export function useIdleAutoCheckout({ isClockdIn, onAutoCheckout, idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS }: UseIdleAutoCheckoutOptions) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didCheckout = useRef(false);
  // Real wall-clock timestamp of the last known activity. setTimeout does not
  // fire while the OS is asleep, so on wake we compare against this instead
  // of blindly restarting the countdown — otherwise a machine that slept for
  // hours gets a fresh full timeout the instant it wakes up.
  // Initialized to 0 (pure literal, not Date.now() — that's impure during
  // render) and set to a real timestamp inside the effect via resetTimer().
  const lastActivityAt = useRef(0);

  useEffect(() => {
    if (!isClockdIn) {
      // Not clocked in — clear any pending timer and reset
      if (timer.current) clearTimeout(timer.current);
      didCheckout.current = false;
      return;
    }

    didCheckout.current = false;

    const checkoutNow = async () => {
      if (didCheckout.current) return;
      didCheckout.current = true;
      setIdleCheckoutFlag();
      await forceCheckoutApi('IDLE_TIMEOUT');
      onAutoCheckout?.();
    };

    const scheduleTimer = (delayMs: number) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(checkoutNow, delayMs);
    };

    const resetTimer = () => {
      if (didCheckout.current) return; // already checked out this session
      lastActivityAt.current = Date.now();
      scheduleTimer(idleTimeoutMs);
    };

    // Start the timer immediately
    resetTimer();

    // Reset on any user activity
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));

    // When the tab regains visibility (including waking from sleep), check
    // how much real time actually elapsed rather than assuming it's fine.
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible' || didCheckout.current) return;
      const elapsed = Date.now() - lastActivityAt.current;
      if (elapsed >= idleTimeoutMs) {
        checkoutNow();
      } else {
        scheduleTimer(idleTimeoutMs - elapsed);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isClockdIn, onAutoCheckout, idleTimeoutMs]);
}
