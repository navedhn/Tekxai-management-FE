import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';

// --- Types ---

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TaskAssignee {
  id: string;
  first_name: string;
  last_name: string;
  avatar?: string | null;
}

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  assignee?: TaskAssignee;
  project_id: string;
  milestone_id?: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  task_id: string;
}

export interface TimeLog {
  id: string;
  task_id: string;
  seconds: number;
  note?: string;
  logged_at: string;
  user?: { first_name: string; last_name: string };
}

// --- Hooks ---

export function useKanbanTasks(projectId: string | null | undefined) {
  return useQuery<KanbanTask[]>({
    queryKey: ['kanban-tasks', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await apiRequest<any>(API_ENDPOINTS.TASK.LIST(projectId));
      return (res?.payload?.records || res?.payload || res || []) as KanbanTask[];
    },
    enabled: !!projectId,
  });
}

export function useUpdateTask(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<KanbanTask> }) => {
      if (!projectId) throw new Error('No projectId');
      const res = await apiRequest<any>(API_ENDPOINTS.TASK.UPDATE(projectId, taskId), {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban-tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['milestones', projectId] });
    },
  });
}

export function useCreateTask(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; description?: string; assigned_to?: string; milestone_id?: string | null; due_date?: string }) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.TASK.CREATE(projectId), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban-tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['milestones', projectId] });
    },
  });
}

export function useDeleteTask(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.TASK.DELETE(projectId, taskId), { method: 'DELETE' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban-tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['milestones', projectId] });
    },
  });
}

export function useSubTasks(taskId: string | null | undefined) {
  return useQuery<SubTask[]>({
    queryKey: ['sub-tasks', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await apiRequest<any>(API_ENDPOINTS.SUB_TASKS(taskId));
      return (res?.payload?.records || res?.payload || res || []) as SubTask[];
    },
    enabled: !!taskId,
  });
}

export function useCreateSubTask(taskId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title: string) => {
      if (!taskId) throw new Error('No taskId');
      return apiRequest<any>(API_ENDPOINTS.SUB_TASKS(taskId), {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-tasks', taskId] });
    },
  });
}

export function useToggleSubTask(taskId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ subTaskId, completed }: { subTaskId: string; completed: boolean }) => {
      if (!taskId) throw new Error('No taskId');
      return apiRequest<any>(`${API_ENDPOINTS.SUB_TASKS(taskId)}/${subTaskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-tasks', taskId] });
    },
  });
}

export function useTaskTimeLogs(taskId: string | null | undefined) {
  return useQuery<TimeLog[]>({
    queryKey: ['time-logs', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await apiRequest<any>(API_ENDPOINTS.TIME_LOGS(taskId));
      return (res?.payload?.records || res?.payload || res || []) as TimeLog[];
    },
    enabled: !!taskId,
  });
}

export function useLogTime(taskId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ seconds, note }: { seconds: number; note?: string }) => {
      if (!taskId) throw new Error('No taskId');
      return apiRequest<any>(API_ENDPOINTS.TIME_LOGS(taskId), {
        method: 'POST',
        body: JSON.stringify({ seconds, note }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-logs', taskId] });
    },
  });
}
