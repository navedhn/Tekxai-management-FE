import { QueryClient } from '@tanstack/react-query';
import { getAccessToken } from '@/utils/tokenMemory';
import { isRefreshEndpoint, logoutSession, refreshSession } from '@/lib/authSession';
import { BASE_URL } from '@/lib/apiConfig';

export { BASE_URL };

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
    headers.set('accept', 'application/json');
  }

  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = { ...options, headers };

  let response = await fetch(url, config);

  if (response.status === 401 && !isRefreshEndpoint(url)) {
    const outcome = await refreshSession();

    if (outcome.status === 'refreshed') {
      headers.set('authorization', `Bearer ${outcome.accessToken}`);
      response = await fetch(url, { ...config, headers });
    } else if (outcome.status === 'expired') {
      // Refresh session genuinely dead/revoked, or user disabled.
      logoutSession();
    }
    // 'transient': network/5xx/429 while refreshing — leave the session
    // intact and let the caller see the original 401 as a normal failure.
  }

  return response;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const response = await fetchWithAuth(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw { status: response.status, data: error, message: error.message || 'Request failed' };
  }

  return response.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});
