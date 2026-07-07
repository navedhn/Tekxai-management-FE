import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

export interface ProjectTimelineEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  created_at: string;
  user?: { id: string; first_name: string; last_name: string } | null;
}

async function fetchTimeline(projectId: string): Promise<ProjectTimelineEntry[]> {
  const res = await apiRequest<any>(API_ENDPOINTS.PROJECT_TIMELINE.LIST(projectId));
  return (res?.payload?.records || res?.payload || res || []) as ProjectTimelineEntry[];
}

export function useProjectTimeline(projectId: string | null | undefined) {
  return useQuery<ProjectTimelineEntry[]>({
    queryKey: QUERY_KEYS.PROJECT_TIMELINE.LIST(projectId || ''),
    queryFn: () => fetchTimeline(projectId!),
    enabled: !!projectId,
    staleTime: 30000,
  });
}
