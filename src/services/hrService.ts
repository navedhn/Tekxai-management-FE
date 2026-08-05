import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, BASE_URL } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { QUERY_KEYS } from '@/services/api/tanstackKeys';
import { getAccessToken } from '@/utils/tokenMemory';

// ── HR Profile ─────────────────────────────────────────────────────────────────

export const useGetEmployeeFullRecord = (userId?: string) =>
  useQuery({
    queryKey: ['employee-full', userId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.HR_PROFILE.FULL_RECORD(userId!)),
    enabled: !!userId,
    select: (r: any) => r?.payload,
  });

export const useGetHRProfile = (userId?: string) =>
  useQuery({
    queryKey: ['hr-profile', userId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.HR_PROFILE.GET(userId!)),
    enabled: !!userId,
    select: (r: any) => r?.payload,
  });

export const useUpsertHRProfile = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiRequest<any>(API_ENDPOINTS.HR_PROFILE.UPDATE(userId), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-profile', userId] });
      qc.invalidateQueries({ queryKey: ['employee-full', userId] });
    },
  });
};

// Updates users-table org-structure fields (designation_id, grade_id, supervisor_id) —
// distinct from the employee_profiles fields above, per Document 4 ownership (People/users module).
export const useUpdateUserOrg = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { designation_id?: string | null; grade_id?: string | null; supervisor_id?: string | null }) =>
      apiRequest<any>(API_ENDPOINTS.USER.UPDATE(userId), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-full', userId] });
      // Designation/grade/supervisor changes here also affect the shared
      // user list (Employee Directory) and the HR Dashboard's roster/stats —
      // none of those are derived from ['employee-full', userId].
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USER.LIST });
      qc.invalidateQueries({ queryKey: ['employee-list-hr-dash'] });
      qc.invalidateQueries({ queryKey: ['employee-stats-hr-dash'] });
      qc.invalidateQueries({ queryKey: ['employee-directory'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEE.DASHBOARD_STATS });
      // Same orphaned-key gap as userService.ts's invalidateUserAndDependents —
      // a designation/grade/supervisor change must also refresh manager/team
      // pickers keyed on 'user-list-brief'.
      qc.invalidateQueries({ queryKey: ['user-list-brief'] });
    },
  });
};

// ── Employee Documents ─────────────────────────────────────────────────────────

export const useGetEmployeeDocs = (userId?: string) =>
  useQuery({
    queryKey: ['employee-docs', userId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EMPLOYEE_DOC.LIST(userId!)),
    enabled: !!userId,
    select: (r: any) => (r?.payload || []) as any[],
  });

export const useGetDocTypes = () =>
  useQuery({
    queryKey: ['doc-types'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EMPLOYEE_DOC.TYPES),
    staleTime: 1000 * 60 * 60,
    select: (r: any) => (r?.payload || []) as { value: string; label: string }[],
  });

export const useCreateEmployeeDoc = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiRequest<any>(API_ENDPOINTS.EMPLOYEE_DOC.CREATE(userId), { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-docs', userId] }),
  });
};

export const useUpdateEmployeeDoc = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, data }: { docId: string; data: any }) =>
      apiRequest<any>(API_ENDPOINTS.EMPLOYEE_DOC.UPDATE(userId, docId), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-docs', userId] }),
  });
};

export const useDeleteEmployeeDoc = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) =>
      apiRequest<any>(API_ENDPOINTS.EMPLOYEE_DOC.DELETE(userId, docId), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-docs', userId] }),
  });
};

// ── Missing Employee Documents report ────────────────────────────────────────────
// Bespoke report (cross-join/gap computation, not a generic /report/builder
// entity+group_by pair) — mirrors the be-work bespoke hr-report module.

export type MissingDocsFilters = {
  business_unit_id?: string; department_id?: string; team_id?: string; designation_id?: string;
  employment_status?: string; missing_document_type?: string; search?: string; page?: number; limit?: number;
};

function missing_docs_qs(filters?: MissingDocsFilters) {
  const search = new URLSearchParams();
  if (filters) for (const [k, v] of Object.entries(filters)) if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const useGetMissingDocumentsReport = (filters?: MissingDocsFilters) =>
  useQuery({
    queryKey: ['missing-documents-report', filters],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.HR_REPORT.MISSING_DOCUMENTS}${missing_docs_qs(filters)}`),
    select: (r: any) => r?.payload as { records: any[]; total: number; page: number; limit: number; required_document_types: any[]; all_document_types: any[] },
  });

export const useGetMissingDocumentsSummary = (filters?: MissingDocsFilters) =>
  useQuery({
    queryKey: ['missing-documents-summary', filters],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.HR_REPORT.MISSING_DOCUMENTS_SUMMARY}${missing_docs_qs(filters)}`),
    select: (r: any) => r?.payload as { total_employees: number; employees_complete: number; employees_with_missing: number; total_missing_documents: number },
  });

// Export triggers an authenticated blob download (report_builder.controller's
// exports are POST; this bespoke report's export is a GET so it can be
// driven by a query string like the list/summary endpoints — either way the
// browser can't just window.open() it since the API requires a bearer
// token, so fetch as a blob and save via an <a download> click, matching the
// download-trigger pattern already used by Employee Directory's CSV export).
export async function downloadMissingDocumentsExport(format: 'excel' | 'csv' | 'pdf', filters?: MissingDocsFilters) {
  const url = `${BASE_URL}${API_ENDPOINTS.HR_REPORT.MISSING_DOCUMENTS_EXPORT}${missing_docs_qs({ ...filters, format } as any)}`;
  const token = getAccessToken();
  const res = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const ext = format === 'excel' ? 'xlsx' : format;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl; a.download = `missing-employee-documents.${ext}`; a.click();
  URL.revokeObjectURL(objectUrl);
}

// ── Reporting Structure ─────────────────────────────────────────────────────────

export const useGetReportingStructure = (userId?: string, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['reporting-structure', userId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.REPORTING_STRUCTURE.GET(userId!)),
    enabled: !!userId && options?.enabled !== false,
    select: (r: any) => r?.payload as { manager: any | null; direct_reports: any[] },
  });

// ── Lifecycle Approvals ──────────────────────────────────────────────────────────

export const useGetLifecycleApprovals = (params?: { status?: string; user_id?: string }, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['lifecycle-approvals', params],
    queryFn: () => {
      const search = new URLSearchParams();
      if (params?.status) search.set('status', params.status);
      if (params?.user_id) search.set('user_id', params.user_id);
      const qs = search.toString();
      return apiRequest<any>(`${API_ENDPOINTS.LIFECYCLE_APPROVALS.LIST}${qs ? `?${qs}` : ''}`);
    },
    enabled: options?.enabled !== false,
    select: (r: any) => r?.payload as { records: any[]; total: number },
  });

// ── Activity Timeline ────────────────────────────────────────────────────────────

export const useGetActivityLog = (params?: { user_id?: string; action?: string; from?: string; to?: string }, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['activity-log', params],
    queryFn: () => {
      const search = new URLSearchParams();
      if (params) for (const [k, v] of Object.entries(params)) if (v) search.set(k, String(v));
      const qs = search.toString();
      return apiRequest<any>(`${API_ENDPOINTS.ACTIVITY_LOG.LIST}${qs ? `?${qs}` : ''}`);
    },
    enabled: options?.enabled !== false,
    select: (r: any) => (r?.payload?.records || r?.payload || []) as any[],
  });

// ── Employee Notes ───────────────────────────────────────────────────────────────

export const useGetEmployeeNotes = (userId?: string, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['employee-notes', userId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EMPLOYEE_NOTES.LIST(userId!)),
    enabled: !!userId && options?.enabled !== false,
    select: (r: any) => (r?.payload || []) as any[],
  });

export const useCreateEmployeeNote = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { body: string; is_private: boolean }) =>
      apiRequest<any>(API_ENDPOINTS.EMPLOYEE_NOTES.CREATE(userId), { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-notes', userId] }),
  });
};

export const useUpdateEmployeeNote = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, data }: { noteId: string; data: { body: string; is_private: boolean } }) =>
      apiRequest<any>(API_ENDPOINTS.EMPLOYEE_NOTES.UPDATE(userId, noteId), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-notes', userId] }),
  });
};

export const useDeleteEmployeeNote = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      apiRequest<any>(API_ENDPOINTS.EMPLOYEE_NOTES.DELETE(userId, noteId), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-notes', userId] }),
  });
};

// ── Payroll (employee payslips) ───────────────────────────────────────────────────

export const useGetEmployeePayslips = (userId?: string, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['employee-payslips', userId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PAYROLL.EMPLOYEE_PAYSLIPS(userId!)),
    enabled: !!userId && options?.enabled !== false,
    select: (r: any) => (r?.payload || []) as any[],
  });

// ── Requisitions ───────────────────────────────────────────────────────────────

export const useGetRequisitionMeta = () =>
  useQuery({
    queryKey: ['requisition-meta'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.REQUISITION.META),
    staleTime: 1000 * 60 * 60,
    select: (r: any) => r?.payload,
  });

export const useGetRequisitions = (filters?: Record<string, any>) =>
  useQuery({
    queryKey: ['requisitions', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (v != null && v !== '') params.set(k, String(v));
        }
      }
      const qs = params.toString();
      return apiRequest<any>(`${API_ENDPOINTS.REQUISITION.LIST}${qs ? `?${qs}` : ''}`);
    },
    select: (r: any) => r?.payload,
  });

export const useGetRequisition = (id?: string) =>
  useQuery({
    queryKey: ['requisition', id],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.REQUISITION.DETAIL(id!)),
    enabled: !!id,
    select: (r: any) => r?.payload,
  });

export const useCreateRequisition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiRequest<any>(API_ENDPOINTS.REQUISITION.CREATE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requisitions'] }),
  });
};

export const useUpdateRequisition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest<any>(API_ENDPOINTS.REQUISITION.UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: ['requisitions'] });
      qc.invalidateQueries({ queryKey: ['requisition', id] });
    },
  });
};

export const useSubmitRequisition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<any>(API_ENDPOINTS.REQUISITION.SUBMIT(id), { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requisitions'] }),
  });
};

export const useApproveRequisition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, comment, stage }: { id: string; action: string; comment?: string; stage?: string }) =>
      apiRequest<any>(API_ENDPOINTS.REQUISITION.APPROVE(id), { method: 'POST', body: JSON.stringify({ action, comment, stage }) }),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: ['requisitions'] });
      qc.invalidateQueries({ queryKey: ['requisition', id] });
    },
  });
};

export const useUpdateRequisitionStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, comment }: { id: string; status: string; comment?: string }) =>
      apiRequest<any>(API_ENDPOINTS.REQUISITION.STATUS(id), { method: 'PATCH', body: JSON.stringify({ status, comment }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requisitions'] }),
  });
};

export const useConvertRequisitionToAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, asset_data }: { id: string; asset_data?: Record<string, any> }) =>
      apiRequest<any>(API_ENDPOINTS.REQUISITION.CONVERT_ASSET(id), { method: 'POST', body: JSON.stringify(asset_data || {}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requisitions'] }),
  });
};

export const useGetRequisitionStats = () =>
  useQuery({
    queryKey: ['requisitions', 'stats'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.REQUISITION.STATS),
    select: (r: any) => r?.payload,
    staleTime: 30_000,
  });

export const useUpdateRequisitionCost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; actual_cost?: number; vendor_name?: string; purchase_notes?: string; purchase_date?: string; invoice_reference?: string }) =>
      apiRequest<any>(API_ENDPOINTS.REQUISITION.COST(id), { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: ['requisitions'] });
      qc.invalidateQueries({ queryKey: ['requisition', id] });
      qc.invalidateQueries({ queryKey: ['requisitions', 'stats'] });
    },
  });
};

// ── Leaves (time-off) ──────────────────────────────────────────────────────────

export const useGetLeaves = (filters?: { status?: string; user_id?: string }) =>
  useQuery({
    queryKey: ['leaves', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.user_id) params.set('user_id', filters.user_id);
      const qs = params.toString();
      return apiRequest<any>(`${API_ENDPOINTS.LEAVE.LIST}${qs ? `?${qs}` : ''}`);
    },
    select: (r: any) => r?.payload,
  });

export const useApproveLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      apiRequest<any>(API_ENDPOINTS.LEAVE.APPROVE(id), { method: 'POST', body: JSON.stringify({ comment }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
};

export const useRejectLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      apiRequest<any>(API_ENDPOINTS.LEAVE.REJECT(id), { method: 'POST', body: JSON.stringify({ comment }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
};

// ── Ticket stats ───────────────────────────────────────────────────────────────

export const useGetTicketStats = () =>
  useQuery({
    queryKey: ['tickets', 'stats'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.TICKET.STATS),
    select: (r: any) => r?.payload,
    staleTime: 30_000,
  });

export const useAddTicketAttachment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; file_key: string; file_name: string; file_url?: string; file_size?: number; mime_type?: string }) =>
      apiRequest<any>(API_ENDPOINTS.TICKET.ATTACHMENTS(id), { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_r, { id }) => qc.invalidateQueries({ queryKey: ['ticket', id] }),
  });
};
