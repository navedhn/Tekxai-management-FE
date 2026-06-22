import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
const v1 = 'api/v1';
export const useGetPolicies = () => useQuery({ queryKey: ['policies'], queryFn: async () => { const r = await apiRequest<any>(`${v1}/policy`); return r?.payload?.records || r?.payload || []; } });
export const useGetMyAcks = () => useQuery({ queryKey: ['policy-acks'], queryFn: async () => { const r = await apiRequest<any>(`${v1}/policy/my-acknowledgements`); return r?.payload || []; } });
export const useCreatePolicy = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(`${v1}/policy`, { method: 'POST', body: JSON.stringify(data) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }) }); };
export const useAcknowledgePolicy = (id: string) => { const qc = useQueryClient(); return useMutation({ mutationFn: () => apiRequest(`${v1}/policy/${id}/acknowledge`, { method: 'POST', body: '{}' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['policies', 'policy-acks'] }) }); };
export const usePublishPolicy = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => apiRequest(`${v1}/policy/${id}/publish`, { method: 'POST', body: '{}' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }) }); };
