import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/socket', () => ({ disconnectSocket: vi.fn() }));
vi.mock('@/lib/queryClient', () => ({ queryClient: { clear: vi.fn() } }));

import { refreshSession, logoutSession } from '@/lib/authSession';
import { useAuthStore } from '@/stores/authStore';

const ACCESS_KEY = 'tekxai_access_token';
const REFRESH_KEY = 'tekxai_refresh_token';

function mockFetchOnce(impl: () => Response | Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('refreshSession — outcome taxonomy', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(ACCESS_KEY, 'old-access');
    localStorage.setItem(REFRESH_KEY, 'refresh-abc');
    useAuthStore.setState({ isLoggedIn: true, user: { id: 'u1' } as never, role: 'EMPLOYEE' });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns 'refreshed' and persists rotated tokens", async () => {
    mockFetchOnce(() =>
      jsonResponse({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } }),
    );

    const outcome = await refreshSession();

    expect(outcome).toEqual({ status: 'refreshed', accessToken: 'new-access' });
    expect(localStorage.getItem(ACCESS_KEY)).toBe('new-access');
    expect(localStorage.getItem(REFRESH_KEY)).toBe('new-refresh');
  });

  it("returns 'expired' when there is no refresh token", async () => {
    localStorage.removeItem(REFRESH_KEY);
    expect(await refreshSession()).toEqual({ status: 'expired' });
  });

  it("returns 'expired' on 401 from /auth/refresh", async () => {
    mockFetchOnce(() => jsonResponse({ message: 'Invalid or expired refresh token' }, 401));
    expect(await refreshSession()).toEqual({ status: 'expired' });
    // does not itself clear tokens — that is logoutSession's job
    expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-abc');
  });

  it("returns 'expired' on 403 from /auth/refresh (disabled user)", async () => {
    mockFetchOnce(() => jsonResponse({ message: 'Account is deactivated' }, 403));
    expect(await refreshSession()).toEqual({ status: 'expired' });
  });

  for (const status of [500, 502, 503, 429]) {
    it(`returns 'transient' on HTTP ${status} (no logout, tokens untouched)`, async () => {
      mockFetchOnce(() => jsonResponse({ message: 'err' }, status));
      expect(await refreshSession()).toEqual({ status: 'transient' });
      expect(localStorage.getItem(ACCESS_KEY)).toBe('old-access');
      expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-abc');
    });
  }

  it("returns 'transient' on a network error", async () => {
    mockFetchOnce(() => Promise.reject(new TypeError('Failed to fetch')));
    expect(await refreshSession()).toEqual({ status: 'transient' });
    expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-abc');
  });

  it("returns 'transient' on an unexpected 2xx body", async () => {
    mockFetchOnce(() => jsonResponse({ data: {} }));
    expect(await refreshSession()).toEqual({ status: 'transient' });
  });

  it('coalesces concurrent callers into one /auth/refresh request (single-flight)', async () => {
    const fetchMock = mockFetchOnce(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return jsonResponse({ data: { accessToken: 'once', refreshToken: 'once-r' } });
    });

    const [a, b, c] = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ status: 'refreshed', accessToken: 'once' });
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });
});

describe('logoutSession', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(ACCESS_KEY, 'a');
    localStorage.setItem(REFRESH_KEY, 'b');
    useAuthStore.setState({ isLoggedIn: true, user: { id: 'u1' } as never, role: 'EMPLOYEE' });
  });

  it('clears local tokens and auth state', () => {
    logoutSession({ broadcast: false });
    expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });
});
