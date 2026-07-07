import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';
import type { ProjectTrackingLink } from '@/types/devopsAccess';

async function fetchLinks(projectId: string): Promise<ProjectTrackingLink[]> {
  const res = await apiRequest<any>(API_ENDPOINTS.TRACKING_LINKS.LIST(projectId));
  return (res?.payload?.records || res?.payload || res || []) as ProjectTrackingLink[];
}

export function useTrackingLinks(projectId: string | null | undefined) {
  return useQuery<ProjectTrackingLink[]>({
    queryKey: QUERY_KEYS.TRACKING_LINKS.LIST(projectId || ''),
    queryFn: () => fetchLinks(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateTrackingLink(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { link_type: string; label?: string; url: string }) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.TRACKING_LINKS.CREATE(projectId), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.TRACKING_LINKS.LIST(projectId || '') }),
  });
}

export function useDeleteTrackingLink(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.TRACKING_LINKS.DELETE(projectId, linkId), { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.TRACKING_LINKS.LIST(projectId || '') }),
  });
}
