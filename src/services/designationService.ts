import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import type { BulkDeleteResult } from './departmentService';

export interface Designation {
  id: string;
  name: string;
  department_id: string | null;
  department?: { id: string; name: string } | null;
  is_active: boolean;
  sort_order: number;
}

export const useGetDesignationsQuery = (departmentId?: string) =>
  useQuery<Designation[]>({
    queryKey: ['designations', departmentId || 'all'],
    queryFn: async () => {
      const qs = departmentId ? `?department_id=${departmentId}` : '';
      const r = await apiRequest<any>(`${API_ENDPOINTS.DESIGNATION.LIST}${qs}`);
      return r?.payload || [];
    },
  });

export const useCreateDesignation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; department_id?: string | null; sort_order?: number }) =>
      apiRequest<any>(API_ENDPOINTS.DESIGNATION.CREATE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['designations'] }),
  });
};

export const useUpdateDesignation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest<any>(API_ENDPOINTS.DESIGNATION.UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['designations'] }),
  });
};

export const useDeleteDesignation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<any>(API_ENDPOINTS.DESIGNATION.DELETE(id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['designations'] }),
  });
};

export const useBulkDeleteDesignations = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const r = await apiRequest<any>(API_ENDPOINTS.DESIGNATION.BULK_DELETE, { method: 'POST', body: JSON.stringify({ ids }) });
      return (r?.payload?.results || []) as BulkDeleteResult[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['designations'] }),
  });
};
