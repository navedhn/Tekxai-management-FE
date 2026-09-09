import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const refreshSession = vi.fn();
const logoutSession = vi.fn();

vi.mock('@/lib/authSession', () => ({
  refreshSession: (...a: unknown[]) => refreshSession(...a),
  logoutSession: (...a: unknown[]) => logoutSession(...a),
  isRefreshEndpoint: (url: string) => url.includes('/auth/refresh'),
}));

import { apiRequest } from '@/lib/queryClient';

const ACCESS_KEY = 'tekxai_access_token';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('fetchWithAuth 401/403/5xx handling', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(ACCESS_KEY, 'expired');
    refreshSession.mockReset();
    logoutSession.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('refreshes on 401 then retries the original request once with the new token', async () => {
    const calls: Array<string | null> = [];
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const auth = new Headers(init?.headers).get('authorization');
      calls.push(auth);
      if (auth === 'Bearer fresh') return json({ ok: true });
      return json({ message: 'Unauthorized' }, 401);
    });
    vi.stubGlobal('fetch', fetchMock);
    refreshSession.mockResolvedValue({ status: 'refreshed', accessToken: 'fresh' });

    const res = await apiRequest<{ ok: boolean }>('/v1/thing');

    expect(res).toEqual({ ok: true });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(logoutSession).not.toHaveBeenCalled();
    expect(calls).toEqual(['Bearer expired', 'Bearer fresh']);
  });

  it('logs out on 401 when refresh is definitively expired', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ message: 'Unauthorized' }, 401)));
    refreshSession.mockResolvedValue({ status: 'expired' });

    await expect(apiRequest('/v1/thing')).rejects.toMatchObject({ status: 401 });
    expect(logoutSession).toHaveBeenCalledTimes(1);
  });

  it('does NOT log out on 401 when the refresh failure is transient', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ message: 'Unauthorized' }, 401)));
    refreshSession.mockResolvedValue({ status: 'transient' });

    await expect(apiRequest('/v1/thing')).rejects.toMatchObject({ status: 401 });
    expect(logoutSession).not.toHaveBeenCalled();
  });

  it('does NOT refresh or log out on a 403', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ message: 'Forbidden' }, 403)));

    await expect(apiRequest('/v1/thing')).rejects.toMatchObject({ status: 403 });
    expect(refreshSession).not.toHaveBeenCalled();
    expect(logoutSession).not.toHaveBeenCalled();
  });

  it('does NOT refresh or log out on a 500', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ message: 'Server error' }, 500)));

    await expect(apiRequest('/v1/thing')).rejects.toMatchObject({ status: 500 });
    expect(refreshSession).not.toHaveBeenCalled();
    expect(logoutSession).not.toHaveBeenCalled();
  });
});
