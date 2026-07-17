import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

export interface ProjectDiscussion {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  user?: { id: string; first_name: string; last_name: string; avatar?: string | null };
}

async function fetchDiscussions(projectId: string): Promise<ProjectDiscussion[]> {
  const res = await apiRequest<any>(API_ENDPOINTS.PROJECT_DISCUSSIONS.LIST(projectId));
  return (res?.payload?.records || res?.payload || res || []) as ProjectDiscussion[];
}

export function useProjectDiscussions(projectId: string | null | undefined) {
  return useQuery<ProjectDiscussion[]>({
    queryKey: QUERY_KEYS.PROJECT_DISCUSSIONS.LIST(projectId || ''),
    queryFn: () => fetchDiscussions(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateDiscussion(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; parent_id?: string }) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.PROJECT_DISCUSSIONS.CREATE(projectId), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT_DISCUSSIONS.LIST(projectId || '') });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.COMMUNICATION_TIMELINE.GET(projectId || '') });
    },
  });
}

export function useDeleteDiscussion(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (discussionId: string) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.PROJECT_DISCUSSIONS.DELETE(projectId, discussionId), { method: 'DELETE' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT_DISCUSSIONS.LIST(projectId || '') });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.COMMUNICATION_TIMELINE.GET(projectId || '') });
    },
  });
}
