import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  /** API field — Prisma stores `message`; older FE used `body`. */
  message?: string;
  body?: string;
  type: string | null;
  is_read: boolean;
  created_at: string;
  entity_type?: string | null;
  entity_id?: string | null;
  link?: string | null;
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

function patchUnreadOptimistic(qc: ReturnType<typeof useQueryClient>, id: string, markAll = false) {
  qc.setQueriesData<NotificationList>({ queryKey: ['notifications'] }, (prev) => {
    if (!prev) return prev;
    const records = prev.records.map((n) => {
      if (markAll) return { ...n, is_read: true };
      if (n.id === id) return { ...n, is_read: true };
      return n;
    });
    const unread_count = markAll
      ? 0
      : Math.max(0, (prev.unread_count || 0) - (prev.records.find((n) => n.id === id && !n.is_read) ? 1 : 0));
    return { ...prev, records, unread_count };
  });
}

export function useNotifications(limit = 20) {
  return useQuery<NotificationList>({
    queryKey: ['notifications', limit],
    queryFn: async () => {
      const res = await apiRequest<any>(`${API_ENDPOINTS.NOTIFICATION.LIST}?limit=${limit}`);
      const payload = (res?.payload || res) as NotificationList;
      // Normalize `message` → `body` for components that still read body.
      return {
        ...payload,
        records: (payload.records || []).map((n) => ({
          ...n,
          body: n.body || n.message || '',
          message: n.message || n.body || '',
        })),
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.NOTIFICATION.READ_ALL, { method: 'PATCH' }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      patchUnreadOptimistic(qc, '', true);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<any>(API_ENDPOINTS.NOTIFICATION.MARK_READ(id), { method: 'PATCH' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      patchUnreadOptimistic(qc, id, false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
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
