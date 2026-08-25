import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
const v1 = 'api/v1';
export const useGetCandidates = () => useQuery({ queryKey: ['candidates'], queryFn: async () => { const r = await apiRequest<any>(`${v1}/onboarding/candidates`); return r?.payload?.records || []; } });
export const useCreateCandidate = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(`${v1}/onboarding/candidates`, { method: 'POST', body: JSON.stringify(data) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };
export const useCreateOffer = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(`${v1}/onboarding/offers`, { method: 'POST', body: JSON.stringify(data) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };
export const useSendOffer = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => apiRequest(`${v1}/onboarding/offers/${id}/send`, { method: 'POST', body: '{}' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };
export const useAcceptOffer = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => apiRequest<any>(`${v1}/onboarding/offers/${id}/accept`, { method: 'POST', body: '{}' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };

export const useGetOnboardingTasks = (userId?: string) => useQuery({
  queryKey: ['onboarding-tasks', userId],
  queryFn: async () => { const r = await apiRequest<any>(`${v1}/onboarding/tasks/${userId}`); return r?.payload?.records || []; },
  enabled: !!userId,
});
export const useCreateOnboardingTask = (userId?: string) => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(`${v1}/onboarding/tasks`, { method: 'POST', body: JSON.stringify({ ...data, user_id: userId }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding-tasks', userId] }) }); };
export const useCompleteOnboardingTask = (userId?: string) => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => apiRequest(`${v1}/onboarding/tasks/${id}/complete`, { method: 'PATCH', body: '{}' }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['onboarding-tasks', userId] }); qc.invalidateQueries({ queryKey: ['onboarding-readiness', userId] }); } }); };

// Real completion-readiness — required vs optional tasks, with a blocking
// list of the required tasks still incomplete. Backed by
// GET /employee-lifecycle/:userId/onboarding-readiness (compute-on-read,
// same endpoint the ONBOARDING -> PROBATION lifecycle gate itself uses).
export const useGetOnboardingReadiness = (userId?: string) => useQuery({
  queryKey: ['onboarding-readiness', userId],
  queryFn: async () => { const r = await apiRequest<any>(`${v1}/employee-lifecycle/${userId}/onboarding-readiness`); return r?.payload; },
  enabled: !!userId,
});
