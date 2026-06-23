import { setMockSession } from '@/mocks/mockAuth';

const ACCESS_TOKEN_KEY = 'tekxai_access_token';
const REFRESH_TOKEN_KEY = 'tekxai_refresh_token';

export const getAccessToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY);

export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY);

export const setAccessToken = (token: string | null): void => {
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const setRefreshToken = (token: string | null): void => {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const setAuthTokens = (accessToken: string, refreshToken?: string | null): void => {
  setAccessToken(accessToken);
  if (refreshToken) setRefreshToken(refreshToken);
};

export const clearAccessToken = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const clearRefreshToken = (): void => {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const clearAuthTokens = (): void => {
  clearAccessToken();
  clearRefreshToken();
  setMockSession(false);
};

export const parseJwtExpiryMs = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const extractTokensFromAuthResponse = (res: unknown): {
  accessToken?: string;
  refreshToken?: string;
  user?: unknown;
} => {
  const data = res as Record<string, unknown>;
  // API shape: { success, data: { user, accessToken, ... } } — also handle legacy { payload: ... }
  const inner = (data?.data ?? data?.payload ?? data) as Record<string, unknown>;
  return {
    accessToken: (inner?.accessToken ?? inner?.access_token ?? data?.accessToken ?? data?.token) as string | undefined,
    refreshToken: (inner?.refreshToken ?? inner?.refresh_token ?? data?.refreshToken) as string | undefined,
    user: (inner?.user ?? data?.user) as unknown,
  };
};
