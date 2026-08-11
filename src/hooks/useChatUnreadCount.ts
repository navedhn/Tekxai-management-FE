import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuthStore } from '@/stores/authStore';
import { getSocket } from '@/lib/socket';

// Powers the sidebar/nav unread badge — separate from the chat page's own
// query cache since this hook is mounted app-wide (Sidebar,
// ChatFloatingButton), not just on /chat. No refetchInterval: the socket
// connection is a singleton (getSocket() reuses it if the chat page also
// has one open) already carrying the events that mean this count changed,
// so this hook attaches its own listeners rather than polling — the fetch
// only runs once on mount/login and again whenever one of those events
// fires. A new message on ANY channel this user belongs to reaches this
// listener too, not just the currently-open one: shared/socket joins every
// membership's room at connect time, and send_message broadcasts to the
// whole channel room regardless of who has it open.
export function useChatUnreadCount() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const qc = useQueryClient();

  useEffect(() => {
    if (!isLoggedIn) return;
    const socket = getSocket();
    if (!socket) return;

    const invalidate = () => qc.invalidateQueries({ queryKey: ['chat-unread-count'] });
    socket.on('message:new', invalidate);
    socket.on('message:read', invalidate);
    socket.on('conversation:update', invalidate);
    // Reconnect recovery — a gap while disconnected could have missed one
    // of the events above; catch up once on the way back rather than
    // silently trusting whatever count was last cached.
    socket.on('connect', invalidate);

    return () => {
      socket.off('message:new', invalidate);
      socket.off('message:read', invalidate);
      socket.off('conversation:update', invalidate);
      socket.off('connect', invalidate);
    };
  }, [isLoggedIn, qc]);

  const { data } = useQuery({
    queryKey: ['chat-unread-count'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.UNREAD_COUNT);
      return (r?.payload?.total ?? r?.payload ?? 0) as number;
    },
    enabled: isLoggedIn,
  });
  return data || 0;
}
