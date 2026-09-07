import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';
import { uploadFile } from '@/lib/upload';

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
  depends_on_ids?: string[];
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

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  user?: { id: string; first_name: string; last_name: string; avatar?: string | null };
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_key?: string | null;
  file_url: string;
  uploaded_by: string;
  created_at: string;
  uploader?: { id: string; first_name: string; last_name: string };
}

const kanbanTasksKey = (projectId: string | null | undefined) => ['kanban-tasks', projectId];
const milestonesKey = (projectId: string | null | undefined) => QUERY_KEYS.MILESTONE.LIST(projectId || '');
const subTasksKey = (taskId: string | null | undefined) => ['sub-tasks', taskId];
const timeLogsKey = (taskId: string | null | undefined) => ['time-logs', taskId];
const taskCommentsKey = (taskId: string | null | undefined) => ['task-comments', taskId];
const taskAttachmentsKey = (taskId: string | null | undefined) => ['task-attachments', taskId];
const timelineKey = (projectId: string | null | undefined) => QUERY_KEYS.COMMUNICATION_TIMELINE.GET(projectId || '');

export function useKanbanTasks(projectId: string | null | undefined) {
  return useQuery<KanbanTask[]>({
    queryKey: kanbanTasksKey(projectId),
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
      qc.invalidateQueries({ queryKey: kanbanTasksKey(projectId) });
      qc.invalidateQueries({ queryKey: milestonesKey(projectId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DASHBOARD });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DETAIL(projectId || '') });
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
      qc.invalidateQueries({ queryKey: kanbanTasksKey(projectId) });
      qc.invalidateQueries({ queryKey: milestonesKey(projectId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DASHBOARD });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DETAIL(projectId || '') });
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
      qc.invalidateQueries({ queryKey: kanbanTasksKey(projectId) });
      qc.invalidateQueries({ queryKey: milestonesKey(projectId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DASHBOARD });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DETAIL(projectId || '') });
    },
  });
}

export function useSubTasks(projectId: string | null | undefined, taskId: string | null | undefined) {
  return useQuery<SubTask[]>({
    queryKey: subTasksKey(taskId),
    queryFn: async () => {
      if (!projectId || !taskId) return [];
      const res = await apiRequest<any>(API_ENDPOINTS.SUB_TASKS(projectId, taskId));
      return (res?.payload?.records || res?.payload || res || []) as SubTask[];
    },
    enabled: !!projectId && !!taskId,
  });
}

export function useCreateSubTask(projectId: string | null | undefined, taskId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title: string) => {
      if (!projectId || !taskId) throw new Error('No taskId');
      return apiRequest<any>(API_ENDPOINTS.SUB_TASKS(projectId, taskId), {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subTasksKey(taskId) });
    },
  });
}

export function useToggleSubTask(projectId: string | null | undefined, taskId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ subTaskId, completed }: { subTaskId: string; completed: boolean }) => {
      if (!projectId || !taskId) throw new Error('No taskId');
      return apiRequest<any>(`${API_ENDPOINTS.SUB_TASKS(projectId, taskId)}/${subTaskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subTasksKey(taskId) });
    },
  });
}

export function useTaskTimeLogs(projectId: string | null | undefined, taskId: string | null | undefined) {
  return useQuery<TimeLog[]>({
    queryKey: timeLogsKey(taskId),
    queryFn: async () => {
      if (!projectId || !taskId) return [];
      const res = await apiRequest<any>(API_ENDPOINTS.TIME_LOGS(projectId, taskId));

      return (res?.payload?.logs || res?.payload?.records || (Array.isArray(res?.payload) ? res.payload : null) || []) as TimeLog[];
    },
    enabled: !!projectId && !!taskId,
  });
}

export function useLogTime(projectId: string | null | undefined, taskId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ seconds, note }: { seconds: number; note?: string }) => {
      if (!projectId || !taskId) throw new Error('No taskId');
      return apiRequest<any>(API_ENDPOINTS.TIME_LOGS(projectId, taskId), {
        method: 'POST',
        body: JSON.stringify({ seconds, note }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timeLogsKey(taskId) });
    },
  });
}

export function useArchiveTask(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.TASK.ARCHIVE(projectId, taskId), { method: 'PATCH' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kanbanTasksKey(projectId) });
      qc.invalidateQueries({ queryKey: milestonesKey(projectId) });
      qc.invalidateQueries({ queryKey: timelineKey(projectId) });
    },
  });
}

export function useUnarchiveTask(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.TASK.UNARCHIVE(projectId, taskId), { method: 'PATCH' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kanbanTasksKey(projectId) });
      qc.invalidateQueries({ queryKey: milestonesKey(projectId) });
      qc.invalidateQueries({ queryKey: timelineKey(projectId) });
    },
  });
}

export function useSetTaskDependencies(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, depends_on_ids }: { taskId: string; depends_on_ids: string[] }) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.TASK.DEPENDENCIES(projectId, taskId), {
        method: 'PUT',
        body: JSON.stringify({ depends_on_ids }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kanbanTasksKey(projectId) });
      qc.invalidateQueries({ queryKey: milestonesKey(projectId) });
    },
  });
}

export function useTaskComments(projectId: string | null | undefined, taskId: string | null | undefined) {
  return useQuery<TaskComment[]>({
    queryKey: taskCommentsKey(taskId),
    queryFn: async () => {
      if (!projectId || !taskId) return [];
      const res = await apiRequest<any>(API_ENDPOINTS.TASK_COMMENTS.LIST(projectId, taskId));
      return (res?.payload?.records || res?.payload || res || []) as TaskComment[];
    },
    enabled: !!projectId && !!taskId,
  });
}

export function useCreateTaskComment(projectId: string | null | undefined, taskId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; parent_id?: string }) => {
      if (!projectId || !taskId) throw new Error('No taskId');
      return apiRequest<any>(API_ENDPOINTS.TASK_COMMENTS.CREATE(projectId, taskId), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskCommentsKey(taskId) });
      qc.invalidateQueries({ queryKey: timelineKey(projectId) });
    },
  });
}

export function useDeleteTaskComment(projectId: string | null | undefined, taskId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => {
      if (!projectId || !taskId) throw new Error('No taskId');
      return apiRequest<any>(API_ENDPOINTS.TASK_COMMENTS.DELETE(projectId, taskId, commentId), { method: 'DELETE' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskCommentsKey(taskId) });
      qc.invalidateQueries({ queryKey: timelineKey(projectId) });
    },
  });
}

export function useTaskAttachments(projectId: string | null | undefined, taskId: string | null | undefined) {
  return useQuery<TaskAttachment[]>({
    queryKey: taskAttachmentsKey(taskId),
    queryFn: async () => {
      if (!projectId || !taskId) return [];
      const res = await apiRequest<any>(API_ENDPOINTS.TASK_ATTACHMENTS.LIST(projectId, taskId));
      return (res?.payload?.records || res?.payload || res || []) as TaskAttachment[];
    },
    enabled: !!projectId && !!taskId,
  });
}

export function useUploadTaskAttachment(projectId: string | null | undefined, taskId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!projectId || !taskId) throw new Error('No taskId');
      const uploaded = await uploadFile(file);
      return apiRequest<any>(API_ENDPOINTS.TASK_ATTACHMENTS.CREATE(projectId, taskId), {
        method: 'POST',
        body: JSON.stringify({ file_name: file.name, file_key: uploaded.file_key, file_url: uploaded.file_url }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskAttachmentsKey(taskId) });
      qc.invalidateQueries({ queryKey: timelineKey(projectId) });
    },
  });
}

export function useDeleteTaskAttachment(projectId: string | null | undefined, taskId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => {
      if (!projectId || !taskId) throw new Error('No taskId');
      return apiRequest<any>(API_ENDPOINTS.TASK_ATTACHMENTS.DELETE(projectId, taskId, attachmentId), { method: 'DELETE' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskAttachmentsKey(taskId) });
      qc.invalidateQueries({ queryKey: timelineKey(projectId) });
    },
  });
}
