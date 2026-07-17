import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';

export const useGetBusinessUnitsQuery = (_filters: Record<string, any> = {}) =>
  useQuery({
    queryKey: ['business-units'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.BUSINESS_UNIT.LIST);
      return r?.payload?.records || r?.payload || [];
    },
  });

export const useGetBusinessUnitDetail = (id: string) =>
  useQuery({
    queryKey: ['business-unit', id],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.BUSINESS_UNIT.DETAIL(id));
      return r?.payload;
    },
    enabled: !!id,
  });

export const useCreateBusinessUnit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiRequest<any>(API_ENDPOINTS.BUSINESS_UNIT.CREATE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-units'] }),
  });
};

export const useUpdateBusinessUnit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest<any>(API_ENDPOINTS.BUSINESS_UNIT.UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-units'] });
      // Departments embed/display business_unit — keep their cache fresh too
      // (e.g. a rename should show up immediately in the Departments grid).
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
  });
};

export const useDeleteBusinessUnit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<any>(API_ENDPOINTS.BUSINESS_UNIT.DELETE(id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-units'] }),
  });
};

export interface BulkDeleteResult { id: string; success: boolean; message?: string; }

export const useBulkDeleteBusinessUnits = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const r = await apiRequest<any>(API_ENDPOINTS.BUSINESS_UNIT.BULK_DELETE, { method: 'POST', body: JSON.stringify({ ids }) });
      return (r?.payload?.results || []) as BulkDeleteResult[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-units'] }),
  });
};
