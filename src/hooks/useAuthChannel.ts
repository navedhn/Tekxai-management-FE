import { useEffect } from 'react';
import { subscribeAuthChannel } from '@/lib/authChannel';
import { logoutSession } from '@/lib/authSession';
import { setAuthTokens } from '@/utils/tokenMemory';

/**
 * Keeps this tab's auth state in sync with its siblings:
 *   - a peer tab refreshed  -> adopt the new tokens (don't reuse a stale one)
 *   - a peer tab logged out  -> tear down local auth here too (without
 *     re-broadcasting, which would loop)
 *
 * Mount once, near the app root.
 */
export const useAuthChannel = (): void => {
  useEffect(() => {
    return subscribeAuthChannel({
      onTokens: (accessToken, refreshToken) => {
        setAuthTokens(accessToken, refreshToken);
      },
      onLogout: () => {
        logoutSession({ broadcast: false });
      },
    });
  }, []);
};
