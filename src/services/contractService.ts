import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
const v1 = 'api/v1';
export const useGetContracts = () => useQuery({ queryKey: ['contracts'], queryFn: async () => { const r = await apiRequest<any>(`${v1}/contract`); return r?.payload?.records || r?.payload || []; } });
export const useGetTemplates = () => useQuery({ queryKey: ['contract-templates'], queryFn: async () => { const r = await apiRequest<any>(`${v1}/contract/templates`); return r?.payload || []; } });
export const useCreateContract = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(`${v1}/contract`, { method: 'POST', body: JSON.stringify(data) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }) }); };
export const useSignContract = (id: string) => { const qc = useQueryClient(); return useMutation({ mutationFn: (signature_data: string) => apiRequest(`${v1}/contract/${id}/sign`, { method: 'POST', body: JSON.stringify({ signature_data }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }) }); };

export const useCreateTemplate = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      apiRequest(`${v1}/contract/templates`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['contract-templates'] }),
  });
};