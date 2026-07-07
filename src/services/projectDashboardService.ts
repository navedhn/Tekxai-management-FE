import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { unwrapApiData } from '@/utils/apiResponse';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

export interface ProjectDashboardStats {
  total: number;
  by_status: Record<string, number>;
  overdue: number;
  blocked: number;
  delivered: number;
  waiting_on_client: number;
  needs_qa: number;
  access_incomplete: number;
  milestones_overdue: number;
  at_risk: number;
  health: { healthy: number; warning: number; critical: number };
}

export function useProjectDashboardStats() {
  return useQuery<ProjectDashboardStats>({
    queryKey: QUERY_KEYS.PROJECT.DASHBOARD,
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PROJECT.DASHBOARD).then(unwrapApiData<ProjectDashboardStats>),
    staleTime: 60000,
  });
}
