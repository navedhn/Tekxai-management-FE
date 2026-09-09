/**
 * Cross-tab auth coordination for the ERP/HR portal.
 *
 * Every tab shares one origin and one `localStorage`. Before this module,
 * two tabs whose 15-minute access tokens expired together each POSTed
 * /auth/refresh with the same refresh token; the backend rotated for the
 * winner and 401'd the loser, and the loser's `logoutSession()` then
 * cleared the shared token keys — logging every tab out.
 *
 * The backend now has a short rotation grace window, and a transient/only-
 * definitive refresh-failure classification lives in authSession.ts. This
 * layer adds best-effort coordination on top:
 *
 *   1. peers hold off briefly while one tab refreshes, then adopt its
 *      result instead of firing their own request, and
 *   2. an explicit logout in one tab propagates to every other tab.
 *
 * Correctness never depends on message delivery — it only removes the
 * thundering herd and keeps tabs in sync.
 */

const CHANNEL_NAME = 'tekxai-erp-auth';

export type AuthChannelMessage =
  | { type: 'tokens'; accessToken: string; refreshToken: string; at: number }
  | { type: 'refresh-start'; at: number }
  | { type: 'logout'; at: number };

type Handlers = {
  onTokens?: (accessToken: string, refreshToken: string) => void;
  onLogout?: () => void;
};

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

let peerRefreshStartedAt = 0;

channel?.addEventListener('message', (event: MessageEvent<AuthChannelMessage>) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'refresh-start') peerRefreshStartedAt = msg.at;
});

function post(msg: AuthChannelMessage): void {
  try {
    channel?.postMessage(msg);
  } catch {
    // A closed/errored channel must never break auth.
  }
}

/** Announce that this tab is starting a refresh, so peers can hold off. */
export function announceRefreshStart(): void {
  post({ type: 'refresh-start', at: Date.now() });
}

/** Announce freshly persisted tokens so peers adopt them. */
export function announceTokens(accessToken: string, refreshToken: string): void {
  post({ type: 'tokens', accessToken, refreshToken, at: Date.now() });
}

/** Announce a logout so every other tab clears its local auth. */
export function announceLogout(): void {
  post({ type: 'logout', at: Date.now() });
}

/** True if a peer tab announced a refresh within the last `withinMs`. */
export function peerRefreshInProgress(withinMs = 6000): boolean {
  return Date.now() - peerRefreshStartedAt < withinMs;
}

/** Install listeners for peer token/logout events. Call once at app start. */
export function subscribeAuthChannel(handlers: Handlers): () => void {
  if (!channel) return () => undefined;
  const listener = (event: MessageEvent<AuthChannelMessage>) => {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'tokens' && handlers.onTokens) {
      handlers.onTokens(msg.accessToken, msg.refreshToken);
    } else if (msg.type === 'logout' && handlers.onLogout) {
      handlers.onLogout();
    }
  };
  channel.addEventListener('message', listener);
  return () => channel.removeEventListener('message', listener);
}
