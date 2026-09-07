import { useCallback, useEffect, useRef, useState } from 'react';
import { applyTheme, getStoredTheme, hasStoredTheme, isThemeId, storeTheme, ThemeId } from '@/lib/theme';
import { useGetMySettingsQuery, useUpdatePreferencesMutation } from '@/services/settingsService';
import { useAuthStore } from '@/stores/authStore';

function readRemoteTheme(settings: unknown): unknown {
  const payload = (settings as { payload?: Record<string, unknown> } | undefined)?.payload;
  if (!payload) return undefined;
  if (isThemeId(payload.theme)) return payload.theme;
  const preferences = payload.preferences as Record<string, unknown> | undefined;
  return preferences?.theme;
}

export function useTheme() {
  const isAuthenticated = useAuthStore((s) => s.isLoggedIn);
  const [theme, setThemeState] = useState<ThemeId>(() => getStoredTheme());
  const { data: settings } = useGetMySettingsQuery(isAuthenticated);
  const updatePreferences = useUpdatePreferencesMutation();
  const healedRemoteRef = useRef(false);

  useEffect(() => {
    const local = getStoredTheme();
    applyTheme(local);
    setThemeState(local);
  }, []);

  useEffect(() => {
    if (!settings) return;

    const remoteTheme = readRemoteTheme(settings);
    const local = getStoredTheme();

    // LocalStorage wins so refresh keeps the user's last choice.
    if (hasStoredTheme()) {
      applyTheme(local);
      setThemeState(local);

      if (
        isAuthenticated &&
        !healedRemoteRef.current &&
        (!isThemeId(remoteTheme) || remoteTheme !== local)
      ) {
        healedRemoteRef.current = true;
        updatePreferences.mutate({ theme: local });
      }
      return;
    }

    if (isThemeId(remoteTheme)) {
      setThemeState(remoteTheme);
      applyTheme(remoteTheme);
      storeTheme(remoteTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, isAuthenticated]);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    applyTheme(next);
    storeTheme(next);
    healedRemoteRef.current = false;
    if (isAuthenticated) {
      updatePreferences.mutate({ theme: next });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return { theme, setTheme };
}
