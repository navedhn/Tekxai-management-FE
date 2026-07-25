import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

const QK = ['job-requisitions'];

export const useGetJobRequisitions = (params?: { status?: string; department_id?: string; page?: number; limit?: number }) =>
  useQuery({
    queryKey: [...QK, params],
    queryFn: async () => {
      const qs = new URLSearchParams(
        Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '') as [string, string][],
      ).toString();
      const url = qs ? `${API_ENDPOINTS.JOB_REQUISITIONS.LIST}?${qs}` : API_ENDPOINTS.JOB_REQUISITIONS.LIST;
      const r = await apiRequest<any>(url);
      return r?.payload || { records: [], total: 0 };
    },
  });

export const useGetJobRequisitionMeta = () =>
  useQuery({
    queryKey: [...QK, 'meta'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.JOB_REQUISITIONS.META);
      return r?.payload || { statuses: [], employment_types: [] };
    },
  });

export const useCreateJobRequisition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest(API_ENDPOINTS.JOB_REQUISITIONS.CREATE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};

export const useApproveJobRequisition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      apiRequest(API_ENDPOINTS.JOB_REQUISITIONS.REVIEW(id), { method: 'POST', body: JSON.stringify({ action: 'APPROVED', comment }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};

export const useRejectJobRequisition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      apiRequest(API_ENDPOINTS.JOB_REQUISITIONS.REVIEW(id), { method: 'POST', body: JSON.stringify({ action: 'REJECTED', comment }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};

export const useMarkJobRequisitionFilled = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(API_ENDPOINTS.JOB_REQUISITIONS.STATUS(id), { method: 'PATCH', body: JSON.stringify({ status: 'FILLED' }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};

export const useCancelJobRequisition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(API_ENDPOINTS.JOB_REQUISITIONS.CANCEL(id), { method: 'POST', body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};
