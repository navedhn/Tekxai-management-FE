import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

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

export const useDeleteEmployeeDoc = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) =>
      apiRequest<any>(API_ENDPOINTS.EMPLOYEE_DOC.DELETE(userId, docId), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-docs', userId] }),
  });
};

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
