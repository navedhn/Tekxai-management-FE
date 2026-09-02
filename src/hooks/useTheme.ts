import { useCallback, useEffect, useState } from 'react';
import { applyTheme, getStoredTheme, isThemeId, storeTheme, ThemeId } from '@/lib/theme';
import { useGetMySettingsQuery, useUpdatePreferencesMutation } from '@/services/settingsService';
import { useAuthStore } from '@/stores/authStore';

/** Local-first, backend-synced theme. localStorage (read synchronously by
 * index.html's inline script, before React even mounts) is the source of
 * truth for what's already painted on screen; the backend's user_settings
 * row is the source of truth for "what should this user see on a new
 * device" and is only consulted to correct a mismatch, never to force a
 * flash. Only queries the backend once authenticated — an anonymous/login
 * screen has no settings row to read. */
export function useTheme() {
  const isAuthenticated = useAuthStore((s) => s.isLoggedIn);
  const [theme, setThemeState] = useState<ThemeId>(getStoredTheme);
  const { data: settings } = useGetMySettingsQuery(isAuthenticated);
  const updatePreferences = useUpdatePreferencesMutation();

  useEffect(() => {
    const remoteTheme = (settings as any)?.payload?.theme;
    if (isThemeId(remoteTheme) && remoteTheme !== theme) {
      setThemeState(remoteTheme);
      applyTheme(remoteTheme);
      storeTheme(remoteTheme);
    }
    // Only ever reacts to the backend value changing — never re-fires from
    // `theme` itself, or a user's own selection below would get immediately
    // overwritten by the stale query result still in cache.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    applyTheme(next);
    storeTheme(next);
    if (isAuthenticated) {
      updatePreferences.mutate({ theme: next } as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return { theme, setTheme };
}
