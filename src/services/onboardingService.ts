import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
const v1 = 'api/v1';
export const useGetCandidates = () => useQuery({ queryKey: ['candidates'], queryFn: async () => { const r = await apiRequest<any>(`${v1}/onboarding/candidates`); return r?.payload?.records || []; } });
export const useCreateCandidate = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(`${v1}/onboarding/candidates`, { method: 'POST', body: JSON.stringify(data) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };
export const useUpdateCandidateStatus = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest(`${v1}/onboarding/candidates/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };

// Candidate-directed email (Rejection / Application Status)
export const useGenerateCandidateEmail = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, type, templateId }: { id: string; type: 'REJECTION' | 'APPLICATION_STATUS'; templateId?: string }) => apiRequest<any>(`${v1}/onboarding/candidates/${id}/email/generate`, { method: 'POST', body: JSON.stringify({ type, template_id: templateId }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };
export const useEditCandidateEmail = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, subject, body }: { id: string; subject?: string; body?: string }) => apiRequest<any>(`${v1}/onboarding/candidates/${id}/email`, { method: 'PUT', body: JSON.stringify({ subject, body }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };
export const useSendCandidateEmail = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => apiRequest<any>(`${v1}/onboarding/candidates/${id}/email/send`, { method: 'POST', body: '{}' }), onSettled: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };

export const useCreateOffer = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(`${v1}/onboarding/offers`, { method: 'POST', body: JSON.stringify(data) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };
export const useGenerateOfferEmail = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ offerId, templateId }: { offerId: string; templateId?: string }) => apiRequest<any>(`${v1}/onboarding/offers/${offerId}/email/generate`, { method: 'POST', body: JSON.stringify({ template_id: templateId }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };
export const useEditOfferEmail = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ offerId, subject, letter_content }: { offerId: string; subject?: string; letter_content?: string }) => apiRequest<any>(`${v1}/onboarding/offers/${offerId}/email`, { method: 'PUT', body: JSON.stringify({ subject, letter_content }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };
// onSettled — same reasoning as useSendInterviewEmail: a FAILED send still
// writes email_status/email_error to the offer row and must be reflected,
// not hidden behind a stale badge because only onSuccess refetched.
export const useSendOffer = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => apiRequest(`${v1}/onboarding/offers/${id}/send`, { method: 'POST', body: '{}' }), onSettled: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };
export const useAcceptOffer = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => apiRequest<any>(`${v1}/onboarding/offers/${id}/accept`, { method: 'POST', body: '{}' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };
export const useRejectOffer = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, reason }: { id: string; reason?: string }) => apiRequest<any>(`${v1}/onboarding/offers/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }) }); };

export const useGetOnboardingTasks = (userId?: string) => useQuery({
  queryKey: ['onboarding-tasks', userId],
  queryFn: async () => { const r = await apiRequest<any>(`${v1}/onboarding/tasks/${userId}`); return r?.payload?.records || []; },
  enabled: !!userId,
});
export const useCreateOnboardingTask = (userId?: string) => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(`${v1}/onboarding/tasks`, { method: 'POST', body: JSON.stringify({ ...data, user_id: userId }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding-tasks', userId] }) }); };
export const useCompleteOnboardingTask = (userId?: string) => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => apiRequest(`${v1}/onboarding/tasks/${id}/complete`, { method: 'PATCH', body: '{}' }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['onboarding-tasks', userId] }); qc.invalidateQueries({ queryKey: ['onboarding-readiness', userId] }); } }); };

export const useGetOnboardingReadiness = (userId?: string) => useQuery({
  queryKey: ['onboarding-readiness', userId],
  queryFn: async () => { const r = await apiRequest<any>(`${v1}/employee-lifecycle/${userId}/onboarding-readiness`); return r?.payload; },
  enabled: !!userId,
});

export const useMoveToProbation = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (userId: string) => apiRequest(`${v1}/employee-lifecycle/${userId}/move-to-probation`, { method: 'POST', body: '{}' }), onSuccess: (_d, userId) => { qc.invalidateQueries({ queryKey: ['candidates'] }); qc.invalidateQueries({ queryKey: ['onboarding-readiness', userId] }); } }); };

// Recruitment email templates
export const useGetEmailTemplates = (type?: string) => useQuery({
  queryKey: ['recruitment-email-templates', type],
  queryFn: async () => { const r = await apiRequest<any>(`${v1}/recruitment/email-templates${type ? `?type=${type}` : ''}`); return r?.payload?.records || []; },
});
