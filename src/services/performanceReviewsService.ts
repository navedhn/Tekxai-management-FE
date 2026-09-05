// Phase 4 Employee Performance Evidence & Review Foundation.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { unwrapApiData, unwrapApiList } from '@/utils/apiResponse';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

export type ReviewStatus = 'DRAFT' | 'IN_REVIEW' | 'COMPLETED';
export type Classification = 'INSUFFICIENT_EVIDENCE' | 'STRONG_PERFORMANCE' | 'MEETS_EXPECTATIONS' | 'NEEDS_IMPROVEMENT' | 'PERFORMANCE_CONCERN';
export type RecommendedAction =
  | 'NO_ACTION' | 'CONTINUE_MONITORING' | 'RECOGNITION' | 'COACHING_REQUIRED'
  | 'TRAINING_REQUIRED' | 'PERFORMANCE_IMPROVEMENT_PLAN' | 'CAPACITY_REVIEW' | 'FURTHER_REVIEW_REQUIRED';

export interface SimpleUser {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
  email?: string | null;
}

export interface ReviewPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'OPEN' | 'CLOSED';
  creator?: SimpleUser | null;
  _count?: { reviews: number };
}

export interface ManagerEvidenceEntry {
  id: string;
  note: string;
  author: SimpleUser;
  project?: { id: string; title: string } | null;
  milestone?: { id: string; title: string } | null;
  created_at: string;
}

export interface PerformanceReview {
  id: string;
  user_id: string;
  reviewer_id: string;
  user: SimpleUser;
  reviewer: SimpleUser;
  completer?: SimpleUser | null;
  review_period?: ReviewPeriod | null;
  designation?: { id: string; name: string } | null;
  status: ReviewStatus;
  classification: Classification | null;
  recommended_action: RecommendedAction | null;
  completed_at: string | null;
  evidence_entries: ManagerEvidenceEntry[];
  created_at: string;
  updated_at: string;
}

// Always server-derived (get_review_evidence_svc) — never computed client-side.
export interface DeliveryFact {
  expected: string;
  deadline: string | null;
  original_deadline: string | null;
  actual: string | null;
  status: 'ON_TIME' | 'MISSED' | 'PENDING';
  missed_reason_category: string | null;
  missed_reason_detail: string | null;
  issue_classification: string | null;
  qa_status: string | null;
  qa_notes: string | null;
  rework_count: number | null;
  evidence_count: number;
}

export interface EvidenceMilestone {
  id: string;
  title: string;
  project: { id: string; title: string } | null;
  status: string;
  outcome: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
  responsible_resources: SimpleUser[];
  delivery: DeliveryFact;
}

export interface ProjectEvidence {
  assigned_projects: { project_id: string; title: string; status: string; role?: string; allocation_percent?: number }[];
  assigned_count: number;
  on_time_count: number;
  missed_count: number;
  pending_count: number;
  successful_count: number;
  failed_count: number;
  qa_passed_count: number;
  qa_failed_count: number;
  qa_not_required_count: number;
  rework_total: number;
  evidence_count: number;
  missed_reason_breakdown: Record<string, number>;
  issue_classification_breakdown: Record<string, number>;
  milestones: EvidenceMilestone[];
}

export interface AttendanceEvidence {
  present_days: number;
  absent_days: number | null;
  late_days: number;
  total_late_minutes: number;
  average_late_minutes: number;
  leave_days: number;
  total_hours: number;
  average_check_in: string | null;
  missing_checkout_count: number;
}

export interface UtilizationEvidence {
  available: boolean;
  reason?: string;
  total_hours: number;
  billable_hours: number;
  utilization_pct: number | null;
}

export interface WarningRecord {
  id: string;
  date: string;
  violation_type: string;
  reason: string | null;
  status: string;
  manager_remarks: string | null;
  hr_remarks: string | null;
  fine_amount: number;
  waived: boolean;
  approved_by: string | null;
}

export interface ReviewEvidence {
  review: PerformanceReview;
  role: { designation: { id: string; name: string } | null; resolved_source: string };
  project_evidence: ProjectEvidence;
  attendance: AttendanceEvidence | null;
  utilization: UtilizationEvidence | null;
  warnings: { restricted: boolean; records: WarningRecord[] };
  manager_evidence: ManagerEvidenceEntry[];
}

// ── Review Periods ───────────────────────────────────────────────────────────
async function fetchReviewPeriods(): Promise<ReviewPeriod[]> {
  const res = await apiRequest<unknown>(API_ENDPOINTS.REVIEW_PERIOD.LIST);
  return unwrapApiList<ReviewPeriod>(res);
}

export const useReviewPeriods = () => useQuery<ReviewPeriod[]>({ queryKey: QUERY_KEYS.REVIEW_PERIOD.LIST, queryFn: fetchReviewPeriods });

export const useCreateReviewPeriod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; start_date: string; end_date: string }) =>
      apiRequest<unknown>(API_ENDPOINTS.REVIEW_PERIOD.CREATE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.REVIEW_PERIOD.LIST }),
  });
};

// ── Reviews ───────────────────────────────────────────────────────────────
export interface ReviewFilters {
  user_id?: string;
  reviewer_id?: string;
  review_period_id?: string;
  status?: ReviewStatus;
  department_id?: string;
  business_unit_id?: string;
}

async function fetchReviews(filters: ReviewFilters): Promise<PerformanceReview[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, String(v)); });
  const qs = params.toString();
  const res = await apiRequest<unknown>(qs ? `${API_ENDPOINTS.PERFORMANCE_REVIEW.LIST}?${qs}` : API_ENDPOINTS.PERFORMANCE_REVIEW.LIST);
  return unwrapApiList<PerformanceReview>(res);
}

export const useReviews = (filters: ReviewFilters = {}) =>
  useQuery<PerformanceReview[]>({ queryKey: QUERY_KEYS.PERFORMANCE_REVIEW.LIST(filters), queryFn: () => fetchReviews(filters) });

async function fetchReviewEvidence(id: string): Promise<ReviewEvidence> {
  const res = await apiRequest<unknown>(API_ENDPOINTS.PERFORMANCE_REVIEW.EVIDENCE(id));
  return unwrapApiData<ReviewEvidence>(res);
}

export const useReviewEvidence = (id: string | null | undefined) =>
  useQuery<ReviewEvidence>({ queryKey: QUERY_KEYS.PERFORMANCE_REVIEW.EVIDENCE(id || ''), queryFn: () => fetchReviewEvidence(id!), enabled: !!id });

function invalidateReview(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: ['performance-review'] });
  if (id) {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.PERFORMANCE_REVIEW.DETAIL(id) });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.PERFORMANCE_REVIEW.EVIDENCE(id) });
  }
}

export const useCreateReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { user_id: string; review_period_id: string }) =>
      apiRequest<unknown>(API_ENDPOINTS.PERFORMANCE_REVIEW.CREATE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => invalidateReview(qc),
  });
};

export const useUpdateReview = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { status?: ReviewStatus; classification?: Classification | null; recommended_action?: RecommendedAction | null }) =>
      apiRequest<unknown>(API_ENDPOINTS.PERFORMANCE_REVIEW.UPDATE(id), { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => invalidateReview(qc, id),
  });
};

export const useAddManagerEvidence = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { note: string; project_id?: string; milestone_id?: string }) =>
      apiRequest<unknown>(API_ENDPOINTS.PERFORMANCE_REVIEW.ADD_MANAGER_EVIDENCE(id), { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => invalidateReview(qc, id),
  });
};

export const useDeleteManagerEvidence = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (evidenceId: string) =>
      apiRequest<unknown>(API_ENDPOINTS.PERFORMANCE_REVIEW.DELETE_MANAGER_EVIDENCE(id, evidenceId), { method: 'DELETE' }),
    onSuccess: () => invalidateReview(qc, id),
  });
};
