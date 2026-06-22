import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';

export const useGetDepartmentsQuery = (_filters: Record<string, any> = {}) =>
  useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.DEPARTMENT.LIST);
      return r?.payload?.records || r?.payload || [];
    },
  });

export const useGetDepartmentDetail = (id: string) =>
  useQuery({
    queryKey: ['department', id],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.DEPARTMENT.DETAIL(id));
      return r?.payload;
    },
    enabled: !!id,
  });

export const useCreateDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiRequest<any>(API_ENDPOINTS.DEPARTMENT.CREATE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
};

export const useUpdateDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest<any>(API_ENDPOINTS.DEPARTMENT.UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
};

export const useDeleteDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<any>(API_ENDPOINTS.DEPARTMENT.DELETE(id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
};
