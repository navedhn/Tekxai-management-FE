import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  getAccessToken,
  getRefreshToken,
  parseJwtExpiryMs,
} from '@/utils/tokenMemory';
import { logoutSession, refreshSession } from '@/lib/authSession';

const REFRESH_BEFORE_EXPIRY_MS = 60_000;
// After a transient failure (offline, 5xx) the proactive refresh must not
// log the user out — it just tries again shortly.
const TRANSIENT_RETRY_MS = 30_000;

export const useTokenRefresh = () => {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const scheduleRefresh = () => {
      clearTimer();

      if (!isLoggedIn) return;

      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if (!accessToken || !refreshToken) return;

      const expiresAt = parseJwtExpiryMs(accessToken);
      if (!expiresAt) return;

      const refreshIn = expiresAt - Date.now() - REFRESH_BEFORE_EXPIRY_MS;

      const runRefresh = async () => {
        const outcome = await refreshSession();
        if (outcome.status === 'expired') {
          logoutSession();
          return;
        }
        if (outcome.status === 'transient') {
          // Keep the user logged in; try again soon.
          timerRef.current = setTimeout(() => void runRefresh(), TRANSIENT_RETRY_MS);
          return;
        }
        scheduleRefresh();
      };

      if (refreshIn <= 0) {
        void runRefresh();
        return;
      }

      timerRef.current = setTimeout(() => {
        void runRefresh();
      }, refreshIn);
    };

    scheduleRefresh();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') scheduleRefresh();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isLoggedIn]);
};
