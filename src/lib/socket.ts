import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '@/utils/tokenMemory';
import { BASE_URL } from '@/lib/apiConfig';

let socket: Socket | null = null;

const SOCKET_URL = BASE_URL.replace(/\/$/, '');

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

    socket.on('connect_error', async (err) => {
      if (!/token/i.test(err.message) && err.message !== 'Authentication required') return;
      const { getRefreshedAccessToken } = await import('@/lib/authSession');
      const newToken = await getRefreshedAccessToken();
      if (newToken && socket) socket.auth = { token: newToken };
    });

    socket.on('session:revoked', async () => {
      const { logoutSession } = await import('@/lib/authSession');
      logoutSession();
    });
  }

  socket.auth = { token };
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
