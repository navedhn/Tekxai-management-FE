import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  getAccessToken,
  getRefreshToken,
  parseJwtExpiryMs,
} from '@/utils/tokenMemory';
import { getRefreshedAccessToken, logoutSession } from '@/lib/authSession';

const REFRESH_BEFORE_EXPIRY_MS = 60_000;

/**
 * Proactively refreshes the access token before it expires.
 * Access tokens are short-lived (~15 min); refresh tokens last longer (~7 days).
 */
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
        const newToken = await getRefreshedAccessToken();
        if (!newToken) {
          logoutSession();
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
