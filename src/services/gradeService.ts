import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';

export interface Grade {
  id: string;
  name: string;
  level: number;
  description?: string | null;
  is_active: boolean;
}

export const useGetGradesQuery = () =>
  useQuery<Grade[]>({
    queryKey: ['grades'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.GRADE.LIST);
      return r?.payload || [];
    },
  });

export const useCreateGrade = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; level: number; description?: string }) =>
      apiRequest<any>(API_ENDPOINTS.GRADE.CREATE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grades'] }),
  });
};

export const useUpdateGrade = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest<any>(API_ENDPOINTS.GRADE.UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grades'] }),
  });
};

export const useDeleteGrade = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<any>(API_ENDPOINTS.GRADE.DELETE(id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grades'] }),
  });
};
