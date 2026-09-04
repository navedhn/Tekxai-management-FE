import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { isMockSession } from '@/mocks/mockAuth';

/**
 * Self-heals the persisted `auth-storage` user snapshot on app load.
 *
 * useAuthStore's `persist` middleware freezes the whole `user` object
 * (avatar, name, designation, ...) in localStorage at login time and never
 * refreshes it afterwards — a value resolved correctly back then (e.g. an
 * avatar URL) can go stale forever once the underlying data changes
 * server-side. GET /auth/me already re-resolves the current user fresh on
 * every call; this just wires it into bootstrap, once per app load, so a
 * returning session picks up current data without requiring logout/login.
 *
 * Runs at most once per mount (guarded by hasRunRef) — not on every render,
 * not on an interval. Fire-and-forget: never blocks rendering, and any
 * failure (network error, expired session — fetchWithAuth already handles
 * 401 refresh/logout on its own) is swallowed so this can't break the
 * existing auth flow.
 */
export const useProfileRefresh = () => {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const updateUserProfile = useAuthStore((s) => s.updateUserProfile);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || hasRunRef.current || isMockSession()) return;
    hasRunRef.current = true;

    apiRequest<{ success: boolean; data: Record<string, unknown> }>(API_ENDPOINTS.AUTH.ME)
      .then((res) => {
        if (res?.data) updateUserProfile(res.data);
      })
      .catch(() => {
        // Expired/invalid session is already handled by fetchWithAuth's own
        // 401 refresh-or-logout path; any other failure just means the
        // persisted snapshot stays as-is until the next app load.
      });
  }, [isLoggedIn, updateUserProfile]);
};
