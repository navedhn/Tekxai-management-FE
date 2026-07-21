import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';
import type { KanbanTask } from './tasksService';

export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface MilestoneMember {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
}

export interface MilestoneDependency {
  id: string;
  title: string;
  status: MilestoneStatus;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  due_date: string | null;
  completed: boolean;
  blocked: boolean;
  sequence: number | null;
  status: MilestoneStatus;
  estimated_start: string | null;
  estimated_end: string | null;
  completed_date: string | null;
  progress_percent: number;
  remarks?: string | null;
  archived_at: string | null;
  depends_on_ids: string[];
  depends_on?: MilestoneDependency[];
  members?: { user: MilestoneMember }[];
  tasks: KanbanTask[];
  created_at: string;
  updated_at: string;
}

export interface MilestoneUpsertPayload {
  title?: string;
  description?: string | null;
  due_date?: string | null;
  sequence?: number | null;
  status?: MilestoneStatus;
  estimated_start?: string | null;
  estimated_end?: string | null;
  progress_percent?: number;
  remarks?: string | null;
  assigned_user_ids?: string[];
  depends_on_ids?: string[];
}

async function fetchMilestones(projectId: string, includeArchived = false): Promise<Milestone[]> {
  const url = includeArchived
    ? `${API_ENDPOINTS.MILESTONE.LIST(projectId)}?include_archived=true`
    : API_ENDPOINTS.MILESTONE.LIST(projectId);
  const res = await apiRequest<any>(url);
  return (res?.payload?.records || res?.payload || res || []) as Milestone[];
}

export function useMilestones(projectId: string | null | undefined, includeArchived = false) {
  return useQuery<Milestone[]>({
    queryKey: [...QUERY_KEYS.MILESTONE.LIST(projectId || ''), includeArchived],
    queryFn: () => fetchMilestones(projectId!, includeArchived),
    enabled: !!projectId,
  });
}

function invalidateMilestoneQueries(qc: ReturnType<typeof useQueryClient>, projectId: string | null | undefined) {
  qc.invalidateQueries({ queryKey: QUERY_KEYS.MILESTONE.LIST(projectId || '') });
  qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DETAIL(projectId || '') });
  qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.LIST });
}

export function useCreateMilestone(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MilestoneUpsertPayload) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.MILESTONE.CREATE(projectId), {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => invalidateMilestoneQueries(qc, projectId),
  });
}

export function useUpdateMilestone(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, updates }: { milestoneId: string; updates: MilestoneUpsertPayload }) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.MILESTONE.UPDATE(projectId, milestoneId), {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => invalidateMilestoneQueries(qc, projectId),
  });
}

export function useArchiveMilestone(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.MILESTONE.ARCHIVE(projectId, milestoneId), { method: 'PATCH' });
    },
    onSuccess: () => invalidateMilestoneQueries(qc, projectId),
  });
}

export function useUnarchiveMilestone(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.MILESTONE.UNARCHIVE(projectId, milestoneId), { method: 'PATCH' });
    },
    onSuccess: () => invalidateMilestoneQueries(qc, projectId),
  });
}

export function useDeleteMilestone(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.MILESTONE.DELETE(projectId, milestoneId), { method: 'DELETE' });
    },
    onSuccess: () => invalidateMilestoneQueries(qc, projectId),
  });
}
