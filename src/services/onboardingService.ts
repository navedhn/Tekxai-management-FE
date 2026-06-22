import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
const v1 = 'api/v1';
export const useGetCandidates = () => useQuery({ queryKey: ['candidates'], queryFn: async () => { const r = await apiRequest<any>(`${v1}/onboarding/candidates`); return r?.payload?.records || []; } });
export const useCreateCandidate = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(`${v1}/onboarding/candidates`, { method: 'POST', body: JSON.stringify(data) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };
export const useCreateOffer = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(`${v1}/onboarding/offers`, { method: 'POST', body: JSON.stringify(data) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };
export const useSendOffer = (id: string) => { const qc = useQueryClient(); return useMutation({ mutationFn: () => apiRequest(`${v1}/onboarding/offers/${id}/send`, { method: 'POST', body: '{}' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };
