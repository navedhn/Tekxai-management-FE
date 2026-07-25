import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';
import { uploadFile } from '@/lib/upload';

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

// --- Query key helpers (kept as plain arrays to match this file's
// pre-existing convention — kanban-tasks/sub-tasks/time-logs already use
// literal arrays rather than the shared QUERY_KEYS registry) ---

const kanbanTasksKey = (projectId: string | null | undefined) => ['kanban-tasks', projectId];
const milestonesKey = (projectId: string | null | undefined) => QUERY_KEYS.MILESTONE.LIST(projectId || '');
const subTasksKey = (taskId: string | null | undefined) => ['sub-tasks', taskId];
const timeLogsKey = (taskId: string | null | undefined) => ['time-logs', taskId];
const taskCommentsKey = (taskId: string | null | undefined) => ['task-comments', taskId];
const taskAttachmentsKey = (taskId: string | null | undefined) => ['task-attachments', taskId];
const timelineKey = (projectId: string | null | undefined) => QUERY_KEYS.COMMUNICATION_TIMELINE.GET(projectId || '');

// --- Hooks ---

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

// --- Sub-tasks ---
// FIX: previously called API_ENDPOINTS.SUB_TASKS(taskId) which built
// `${v1}/tasks/${taskId}/sub-tasks` — a path that was never mounted
// (tasks.routes.js only mounts at /project/:projectId/tasks, see
// be-work/src/routes/index.js line ~105), so every sub-task call 404'd.
// Now takes projectId + taskId to match the corrected endpoint builder.

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

// --- Time logs ---

export function useTaskTimeLogs(projectId: string | null | undefined, taskId: string | null | undefined) {
  return useQuery<TimeLog[]>({
    queryKey: timeLogsKey(taskId),
    queryFn: async () => {
      if (!projectId || !taskId) return [];
      const res = await apiRequest<any>(API_ENDPOINTS.TIME_LOGS(projectId, taskId));
      // FIX: this endpoint's payload shape is { logs: [...], total_seconds }
      // (see be-work time_logs.controller.js), not a bare array/records list
      // like every other list endpoint in this file — the generic
      // `payload.records || payload` unwrap silently returned the whole
      // object here, and TimeLogSection's timeLogs.reduce(...) then crashed
      // the whole app with "timeLogs.reduce is not a function" the first
      // time a task drawer was opened.
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

// --- Task archive/restore ---

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

// --- Task dependencies (depends_on_ids, modeled on milestones.depends_on_ids) ---
// Note: the backend rejects self-dependency with a 400 (verified in
// tasks controller) but there is no server-side circular-dependency
// detection — the picker below only excludes the task itself client-side.

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

// --- Task comments (modeled on project_discussions) ---

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

// Only list+create exist on the task_comments controller (no update
// endpoint) — so no edit hook here, matching what the backend supports.
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

// --- Task attachments (modeled on project_documents: client uploads the
// file first via the shared uploadFile() helper, then posts the resulting
// URL/key here — no direct file-handling on this endpoint) ---

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

// Only list+create+delete exist on the task_attachments controller (no
// "replace" endpoint) — so no replace hook here.
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
