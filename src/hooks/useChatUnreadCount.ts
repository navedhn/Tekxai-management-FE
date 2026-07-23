import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuthStore } from '@/stores/authStore';

// Powers the sidebar/nav unread badge — separate from the chat page's own
// per-channel polling so the badge works even when the chat page isn't
// mounted. 15s is intentionally slower than the chat page's 3-5s polling;
// a nav badge doesn't need sub-5s freshness.
export function useChatUnreadCount() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const { data } = useQuery({
    queryKey: ['chat-unread-count'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.CHAT.UNREAD_COUNT);
      return (r?.payload?.total ?? r?.payload ?? 0) as number;
    },
    enabled: isLoggedIn,
    refetchInterval: 15000,
    staleTime: 10000,
  });
  return data || 0;
}
