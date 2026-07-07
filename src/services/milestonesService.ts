import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';
import type { KanbanTask } from './tasksService';

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  due_date: string | null;
  completed: boolean;
  tasks: KanbanTask[];
  created_at: string;
  updated_at: string;
}

async function fetchMilestones(projectId: string): Promise<Milestone[]> {
  const res = await apiRequest<any>(API_ENDPOINTS.MILESTONE.LIST(projectId));
  return (res?.payload?.records || res?.payload || res || []) as Milestone[];
}

export function useMilestones(projectId: string | null | undefined) {
  return useQuery<Milestone[]>({
    queryKey: QUERY_KEYS.MILESTONE.LIST(projectId || ''),
    queryFn: () => fetchMilestones(projectId!),
    enabled: !!projectId,
  });
}

export function useUpdateMilestone(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, updates }: { milestoneId: string; updates: Partial<Pick<Milestone, 'title' | 'due_date' | 'completed' | 'description'>> }) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.MILESTONE.UPDATE(projectId, milestoneId), {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MILESTONE.LIST(projectId || '') });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DETAIL(projectId || '') });
    },
  });
}

export function useDeleteMilestone(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.MILESTONE.DELETE(projectId, milestoneId), { method: 'DELETE' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MILESTONE.LIST(projectId || '') });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DETAIL(projectId || '') });
    },
  });
}
