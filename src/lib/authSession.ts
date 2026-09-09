import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuthStore } from '@/stores/authStore';
import {
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  clearAuthTokens,
  parseJwtExpiryMs,
  extractTokensFromAuthResponse,
} from '@/utils/tokenMemory';
import { BASE_URL } from '@/lib/apiConfig';
import { disconnectSocket } from '@/lib/socket';
import {
  announceLogout,
  announceRefreshStart,
  announceTokens,
  peerRefreshInProgress,
} from '@/lib/authChannel';

/**
 * Outcome taxonomy for a refresh attempt — the core of the "randomly logged
 * out during normal use" fix.
 *
 *   'refreshed'  new access token obtained + persisted -> retry, stay in
 *   'transient'  network error / timeout / 429 / 5xx    -> DO NOT logout;
 *                                                          fail the request,
 *                                                          retry later
 *   'expired'    401/403 from /auth/refresh, or no refresh token at all
 *                                                       -> clear local auth,
 *                                                          re-login
 *
 * Only an 'expired' outcome may tear down the session. A 'transient' outcome
 * leaves stored tokens untouched.
 */
export type RefreshOutcome =
  | { status: 'refreshed'; accessToken: string }
  | { status: 'transient' }
  | { status: 'expired' };

let refreshInFlight: Promise<RefreshOutcome> | null = null;

export const logoutSession = (opts?: { broadcast?: boolean }): void => {
  const { broadcast = true } = opts ?? {};
  disconnectSocket();
  clearAuthTokens();
  useAuthStore.getState().userLogout();

  import('@/lib/queryClient').then(({ queryClient }) => queryClient.clear());

  if (broadcast) announceLogout();
};

function isExpiredJwt(token: string): boolean {
  const expiresAt = parseJwtExpiryMs(token);
  return expiresAt !== null && expiresAt <= Date.now();
}

async function performRefresh(): Promise<RefreshOutcome> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return { status: 'expired' };

  announceRefreshStart();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
      signal: controller.signal,
    });

    if (!response.ok) {
      // 401/403 => the refresh session itself is dead/revoked, or the user
      // is disabled. Everything else (429, 5xx, gateway errors) is
      // infrastructure noise — keep the user logged in.
      return response.status === 401 || response.status === 403
        ? { status: 'expired' }
        : { status: 'transient' };
    }

    const data = await response.json().catch(() => null);
    const { accessToken, refreshToken: newRefreshToken } = extractTokensFromAuthResponse(
      data ?? {},
    );

    // Unexpected 2xx shape — don't nuke a session that is probably fine.
    if (!accessToken) return { status: 'transient' };

    setAuthTokens(accessToken, newRefreshToken ?? refreshToken);
    announceTokens(accessToken, newRefreshToken ?? refreshToken);
    return { status: 'refreshed', accessToken };
  } catch {
    // AbortError (timeout) / TypeError (offline, DNS, TLS, CORS) -> transient
    return { status: 'transient' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Refresh the access token. Single-flight per tab (concurrent callers share
 * one promise) and best-effort coordinated across tabs. Never throws.
 */
export const refreshSession = (): Promise<RefreshOutcome> => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      // If a sibling tab is mid-refresh, wait briefly for it to publish a
      // fresh token (adopted via the authChannel `tokens` handler) rather
      // than firing a duplicate request with the same refresh token.
      if (peerRefreshInProgress()) {
        for (let i = 0; i < 20; i += 1) {
          await new Promise((r) => setTimeout(r, 150));
          const token = getAccessToken();
          if (token && !isExpiredJwt(token)) {
            return { status: 'refreshed', accessToken: token } as RefreshOutcome;
          }
          if (!peerRefreshInProgress()) break;
        }
      }
      return performRefresh();
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

/**
 * Token-or-null helper for callers that do NOT make session-teardown
 * decisions (e.g. the socket re-auth handler). A null result here just means
 * "couldn't refresh right now", never "log the user out".
 */
export const getRefreshedAccessToken = async (): Promise<string | null> => {
  const outcome = await refreshSession();
  return outcome.status === 'refreshed' ? outcome.accessToken : null;
};

/** @deprecated use {@link refreshSession} (outcome-typed) or
 *  {@link getRefreshedAccessToken} (token-or-null). Kept for existing callers. */
export const refreshAccessToken = getRefreshedAccessToken;

export const isRefreshEndpoint = (url: string): boolean =>
  url.includes(API_ENDPOINTS.AUTH.REFRESH);
