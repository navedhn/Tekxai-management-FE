import { useCallback, useEffect, useState } from 'react';
import { applyTheme, getStoredTheme, isThemeId, storeTheme, ThemeId } from '@/lib/theme';
import { useGetMySettingsQuery, useUpdatePreferencesMutation } from '@/services/settingsService';
import { useAuthStore } from '@/stores/authStore';

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
