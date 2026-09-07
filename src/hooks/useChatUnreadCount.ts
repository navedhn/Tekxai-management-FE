import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuthStore } from '@/stores/authStore';
import { getSocket } from '@/lib/socket';

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
