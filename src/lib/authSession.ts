import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuthStore } from '@/stores/authStore';
import {
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  clearAuthTokens,
  extractTokensFromAuthResponse,
} from '@/utils/tokenMemory';
import { BASE_URL } from '@/lib/apiConfig';

let refreshInFlight: Promise<string | null> | null = null;

export const logoutSession = (): void => {
  clearAuthTokens();
  useAuthStore.getState().userLogout();
};

export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
    credentials: 'include',
  });

  if (!response.ok) return null;

  const data = await response.json();
  const { accessToken, refreshToken: newRefreshToken } = extractTokensFromAuthResponse(data);

  if (!accessToken) return null;

  setAuthTokens(accessToken, newRefreshToken ?? refreshToken);
  return accessToken;
};

/** Deduplicates concurrent refresh attempts across API calls */
export const getRefreshedAccessToken = (): Promise<string | null> => {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

export const isRefreshEndpoint = (url: string): boolean =>
  url.includes(API_ENDPOINTS.AUTH.REFRESH);
