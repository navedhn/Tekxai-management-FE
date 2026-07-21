import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';
import type { CommChannel } from '@/types/devopsAccess';

export interface ClientWeeklyUpdate {
  id: string;
  project_id: string;
  update_date: string;
  updated_by: string | null;
  method: CommChannel;
  summary: string;
  client_response: string | null;
  attachment_url: string | null;
  created_at: string;
  updater?: { id: string; first_name: string; last_name: string; avatar?: string | null } | null;
}

async function fetchUpdates(projectId: string): Promise<ClientWeeklyUpdate[]> {
  const res = await apiRequest<any>(API_ENDPOINTS.WEEKLY_UPDATES.LIST(projectId));
  return (res?.payload?.records || res?.payload || res || []) as ClientWeeklyUpdate[];
}

export function useWeeklyUpdates(projectId: string | null | undefined) {
  return useQuery<ClientWeeklyUpdate[]>({
    queryKey: QUERY_KEYS.WEEKLY_UPDATES.LIST(projectId || ''),
    queryFn: () => fetchUpdates(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateWeeklyUpdate(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { method: CommChannel; summary: string; client_response?: string; update_date?: string; attachment_url?: string }) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.WEEKLY_UPDATES.CREATE(projectId), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.WEEKLY_UPDATES.LIST(projectId || '') }),
  });
}

export function useDeleteWeeklyUpdate(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updateId: string) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.WEEKLY_UPDATES.DELETE(projectId, updateId), { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.WEEKLY_UPDATES.LIST(projectId || '') }),
  });
}
