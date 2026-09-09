import { afterEach, describe, expect, it } from 'vitest';
import { announceLogout, announceTokens, subscribeAuthChannel } from '@/lib/authChannel';

/**
 * Two "tabs" in one jsdom context: the module's own BroadcastChannel is
 * tab A, a second channel we open here is tab B. BroadcastChannel never
 * echoes to the sending instance — exactly the cross-tab semantics.
 */
describe('authChannel cross-tab messaging', () => {
  const cleanups: Array<() => void> = [];
  afterEach(() => {
    for (const c of cleanups.splice(0)) c();
  });

  it('delivers rotated tokens from one tab to another', async () => {
    const received: Array<[string, string]> = [];
    cleanups.push(subscribeAuthChannel({ onTokens: (a, r) => received.push([a, r]) }));

    const tabB = new BroadcastChannel('tekxai-erp-auth');
    cleanups.push(() => tabB.close());
    tabB.postMessage({ type: 'tokens', accessToken: 'na', refreshToken: 'nr', at: Date.now() });

    await new Promise((r) => setTimeout(r, 10));
    expect(received).toEqual([['na', 'nr']]);
  });

  it('delivers an explicit logout from one tab to another', async () => {
    let count = 0;
    cleanups.push(subscribeAuthChannel({ onLogout: () => (count += 1) }));

    const tabB = new BroadcastChannel('tekxai-erp-auth');
    cleanups.push(() => tabB.close());
    tabB.postMessage({ type: 'logout', at: Date.now() });

    await new Promise((r) => setTimeout(r, 10));
    expect(count).toBe(1);
  });

  it('announce helpers never throw', () => {
    expect(() => announceTokens('a', 'b')).not.toThrow();
    expect(() => announceLogout()).not.toThrow();
  });
});
