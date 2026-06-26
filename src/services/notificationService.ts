import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationList {
  records: Notification[];
  total: number;
  unread_count: number;
  page: number;
  limit: number;
  pages: number;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function useNotifications(limit = 20) {
  return useQuery<NotificationList>({
    queryKey: ['notifications', limit],
    queryFn: async () => {
      const res = await apiRequest<any>(`${API_ENDPOINTS.NOTIFICATION.LIST}?limit=${limit}`);
      return (res?.payload || res) as NotificationList;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.NOTIFICATION.READ_ALL, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<any>(API_ENDPOINTS.NOTIFICATION.MARK_READ(id), { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<any>(API_ENDPOINTS.NOTIFICATION.DELETE(id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export { timeAgo };
