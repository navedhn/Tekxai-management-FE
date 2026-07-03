import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
const v1 = 'api/v1';

export interface Screenshot {
  id: string;
  session_id: string;
  user_id: string;
  file_key: string;
  file_url?: string;
  width?: number;
  height?: number;
  monitor_index: number;
  captured_at: string;
  user?: { id: string; first_name: string; last_name: string };
}

export interface ProductivitySession {
  id: string;
  user_id: string;
  date: string;
  active_seconds: number;
  idle_seconds: number;
  mouse_events: number;
  keyboard_events: number;
  productivity_score: number;
  user?: { id: string; first_name: string; last_name: string };
}

export const useGetScreenshots = (params?: Record<string, string>) =>
  useQuery({
    queryKey: ['screenshots', params],
    queryFn: async () => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      const r = await apiRequest<any>(`${v1}/monitoring/screenshots${qs}`);
      return r?.payload || { records: [], total: 0 };
    },
    staleTime: 0,
  });

export const useGetProductivity = (params?: Record<string, string>) =>
  useQuery({
    queryKey: ['productivity', params],
    queryFn: async () => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      const r = await apiRequest<any>(`${v1}/monitoring/productivity${qs}`);
      return r?.payload?.records || [];
    },
    staleTime: 30000,
  });

export interface AppUsageEntry {
  app_name: string;
  duration_seconds: number;
  percentage: number;
}

export const useGetAppUsage = (params?: Record<string, string>) =>
  useQuery({
    queryKey: ['app-usage', params],
    queryFn: async () => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      const r = await apiRequest<any>(`${v1}/monitoring/app-usage${qs}`);
      return (r?.payload?.app_summary || []) as AppUsageEntry[];
    },
    staleTime: 30000,
  });

export const useUpdateProductivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProductivitySession>) =>
      apiRequest(`${v1}/monitoring/productivity`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productivity'] }),
  });
};

export const useStartSession = () =>
  useMutation({
    mutationFn: (data: { agent_version?: string; os_platform?: string }) =>
      apiRequest(`${v1}/monitoring/session/start`, { method: 'POST', body: JSON.stringify(data) }),
  });

export const useEndSession = () =>
  useMutation({
    mutationFn: (sessionId: string) =>
      apiRequest(`${v1}/monitoring/session/${sessionId}/end`, { method: 'POST', body: '{}' }),
  });

export const useUploadScreenshot = () =>
  useMutation({
    mutationFn: (data: { session_id: string; file_key: string; file_url?: string; monitor_index?: number }) =>
      apiRequest(`${v1}/monitoring/screenshot`, { method: 'POST', body: JSON.stringify(data) }),
  });

export const useDeleteScreenshot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`${v1}/monitoring/screenshot/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['screenshots'] }),
  });
};

export const useBulkDeleteScreenshots = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiRequest(`${v1}/monitoring/screenshots/bulk`, {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['screenshots'] }),
  });
};
