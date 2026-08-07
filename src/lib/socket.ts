import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '@/utils/tokenMemory';
import { BASE_URL } from '@/lib/apiConfig';

let socket: Socket | null = null;

// Same-origin/port as the REST API — socket.io upgrades the connection on
// the http server the Express app already listens on (see be-work's
// server.js), no separate host/port to configure. BASE_URL is the bare
// origin (endpoints.ts appends 'api/v1/...' per-call), so just drop any
// trailing slash.
const SOCKET_URL = BASE_URL.replace(/\/$/, '');

/** Lazily creates (or returns) the single shared socket connection for this
 * tab. Call after login once an access token exists; the socket.io client's
 * built-in reconnection (enabled by default) handles drops automatically —
 * no manual reconnect loop needed. */
export function getSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;

  if (socket && socket.connected) return socket;

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  }

  // Token may have rotated (refresh) since the socket was created — always
  // hand the current one to the next connect attempt.
  socket.auth = { token };
  if (!socket.connected) socket.connect();
  return socket;
}

/** Call on logout so a stale token/session doesn't linger on an open
 * connection and so the next login starts a clean socket. */
export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
