import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

export interface ProjectResourceActiveProject {
  project_id: string;
  project_title: string;
  allocation_percent: number;
}

export interface ProjectResourceMember {
  member_id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    avatar: string | null;
    email: string;
  };
  role: string;
  allocation_percent: number;
  joined_at: string;
  total_allocation_percent: number;
  available_capacity_percent: number;
  over_allocated: boolean;
  active_projects: ProjectResourceActiveProject[];
}

export function useProjectResources(projectId: string | null) {
  return useQuery<ProjectResourceMember[]>({
    queryKey: QUERY_KEYS.PROJECT.RESOURCES(projectId || ''),
    queryFn: async () => {
      const res = await apiRequest<any>(API_ENDPOINTS.PROJECT.RESOURCES(projectId as string));
      return (res?.payload || res || []) as ProjectResourceMember[];
    },
    enabled: !!projectId,
  });
}
