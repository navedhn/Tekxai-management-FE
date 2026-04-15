import { QueryClient } from '@tanstack/react-query';
import { getAccessToken, setAccessToken, clearAccessToken } from '@/utils/tokenMemory';
import { useAuthStore } from '@/stores/authStore';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.231:3022/';

// Custom fetch function with token handling and refresh logic
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
    headers.set('accept', 'application/json');
  }

  // Automatically set Content-Type if body is present
  if (options.body && typeof options.body === 'string') {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  // Merge headers
  const config: RequestInit = {
    ...options,
    headers,
  };

  let response = await fetch(url, config);

  // Handle 401 errors with token refresh
  if (response.status === 401) {
    try {
      // Try to refresh the token
      const refreshResponse = await fetch(`${BASE_URL}auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'accept': 'application/json',
        },
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const accessToken = refreshData?.payload?.accessToken || refreshData?.accessToken || refreshData?.token;

        if (accessToken) {
          setAccessToken(accessToken);
          // Retry original request with new token
          headers.set('authorization', `Bearer ${accessToken}`);
          response = await fetch(url, { ...config, headers });
        } else {
          // Refresh failed, logout user
          clearAccessToken();
          useAuthStore.getState().userLogout();
          throw new Error('Token refresh failed');
        }
      } else {
        // Refresh failed, logout user
        clearAccessToken();
        useAuthStore.getState().userLogout();
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      clearAccessToken();
      useAuthStore.getState().userLogout();
      throw error;
    }
  }

  return response;
}

// API helper function
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

// Create QueryClient with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 0,
    },
  },
});

