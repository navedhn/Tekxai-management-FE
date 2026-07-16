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

export interface BulkDeleteResult { id: string; success: boolean; message?: string; }

export const useBulkDeleteDepartments = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const r = await apiRequest<any>(API_ENDPOINTS.DEPARTMENT.BULK_DELETE, { method: 'POST', body: JSON.stringify({ ids }) });
      return (r?.payload?.results || []) as BulkDeleteResult[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
};

// --- Divisions (org-structure sibling of Departments) ---

export const useGetDivisionsQuery = (departmentId?: string) =>
  useQuery({
    queryKey: ['divisions', departmentId || 'all'],
    queryFn: async () => {
      const qs = departmentId ? `?department_id=${departmentId}` : '';
      const r = await apiRequest<any>(`${API_ENDPOINTS.DIVISION.LIST}${qs}`);
      return r?.payload || [];
    },
  });

export const useCreateDivision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ department_id, ...data }: any) =>
      apiRequest<any>(API_ENDPOINTS.DEPARTMENT.DIVISIONS(department_id), { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['divisions'] }),
  });
};

export const useUpdateDivision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest<any>(API_ENDPOINTS.DIVISION.UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['divisions'] }),
  });
};

export const useDeleteDivision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<any>(API_ENDPOINTS.DIVISION.DELETE(id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['divisions'] }),
  });
};

export const useBulkDeleteDivisions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const r = await apiRequest<any>(API_ENDPOINTS.DIVISION.BULK_DELETE, { method: 'POST', body: JSON.stringify({ ids }) });
      return (r?.payload?.results || []) as BulkDeleteResult[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['divisions'] }),
  });
};
