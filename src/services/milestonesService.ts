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

export type MilestonePaymentStatus = 'UNPAID' | 'PAID';

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
  // Milestone Financial Foundation — independent of `status`/`completed`
  // above (see milestones.repository.js/schema comment). `price` always
  // inherits the parent project's budget_currency; there is no per-milestone
  // currency.
  price: number;
  payment_status: MilestonePaymentStatus;
  created_at: string;
  updated_at: string;
  // Phase 3 Project Delivery & Evidence Foundation.
  original_due_date?: string | null;
  missed_reason_category?: MissedReasonCategory | null;
  missed_reason_detail?: string | null;
  issue_classification?: IssueClassification | null;
  qa_status?: QaStatus | null;
  qa_notes?: string | null;
  rework_count?: number | null;
  delivery?: MilestoneDelivery;
}

// Phase 3 Project Delivery & Evidence Foundation — deliberately separate
// controlled vocabularies: "what happened" (missed_reason_category) is
// never conflated with "whose/what fault" (issue_classification). Neither
// is ever auto-derived from lateness — both are management-entered facts.
export type MissedReasonCategory =
  | 'CLIENT_DEPENDENCY' | 'ACCESS_INFRASTRUCTURE' | 'SCOPE_CHANGE' | 'BLOCKER'
  | 'RESOURCE_CAPACITY' | 'TECHNICAL_ISSUE' | 'QUALITY_REWORK' | 'OTHER';
export type IssueClassification =
  | 'PERFORMANCE' | 'CAPACITY' | 'EXTERNAL_DEPENDENCY' | 'SCOPE_CHANGE'
  | 'TECHNICAL_INFRASTRUCTURE' | 'QUALITY_REWORK' | 'OTHER';
export type QaStatus = 'NOT_REQUIRED' | 'PASSED' | 'FAILED';
export type DeliveryStatus = 'ON_TIME' | 'MISSED' | 'PENDING';

// Always server-derived (see compute_delivery in milestones.repository.js)
// — never computed or fabricated client-side.
export interface MilestoneDelivery {
  expected: string;
  deadline: string | null;
  original_deadline: string | null;
  actual: string | null;
  status: DeliveryStatus;
  missed_reason_category: MissedReasonCategory | null;
  missed_reason_detail: string | null;
  issue_classification: IssueClassification | null;
  qa_status: QaStatus | null;
  qa_notes: string | null;
  rework_count: number | null;
  evidence_count: number;
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
  price?: number;
  payment_status?: MilestonePaymentStatus;
  missed_reason_category?: MissedReasonCategory | null;
  missed_reason_detail?: string | null;
  issue_classification?: IssueClassification | null;
  qa_status?: QaStatus | null;
  qa_notes?: string | null;
  rework_count?: number | null;
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

// Drag-and-drop reorder — sends the full new id order, backend renumbers
// 1..N by array position in one transaction (see reorder_milestones_svc /
// PATCH .../milestones/reorder). Optimistically writes the new order into
// the cache immediately (so the drag feels instant) and rolls back on error;
// the follow-up invalidation reconciles with the server-computed sequence.
export function useReorderMilestones(projectId: string | null | undefined, includeArchived = false) {
  const qc = useQueryClient();
  const queryKey = [...QUERY_KEYS.MILESTONE.LIST(projectId || ''), includeArchived];
  return useMutation({
    mutationFn: (orderedIds: string[]) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.MILESTONE.REORDER(projectId), {
        method: 'PATCH',
        body: JSON.stringify({ ordered_ids: orderedIds }),
      });
    },
    onMutate: async (orderedIds: string[]) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<Milestone[]>(queryKey);
      if (previous) {
        const byId = new Map(previous.map((m) => [m.id, m]));
        const reordered = orderedIds
          .map((id, i) => {
            const m = byId.get(id);
            return m ? { ...m, sequence: i + 1 } : null;
          })
          .filter(Boolean) as Milestone[];
        // keep any rows not included (shouldn't normally happen) at the end
        const missing = previous.filter((m) => !orderedIds.includes(m.id));
        qc.setQueryData(queryKey, [...reordered, ...missing]);
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(queryKey, context.previous);
    },
    onSettled: () => invalidateMilestoneQueries(qc, projectId),
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
