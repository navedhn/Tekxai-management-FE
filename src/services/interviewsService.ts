import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

export const useGetInterviewsForCandidate = (candidateId?: string) => useQuery({
  queryKey: ['interviews', candidateId],
  queryFn: async () => { const r = await apiRequest<any>(API_ENDPOINTS.INTERVIEWS.LIST_FOR_CANDIDATE(candidateId as string)); return r?.payload?.records || r?.payload || []; },
  enabled: !!candidateId,
});

export const useGetUpcomingInterviews = () => useQuery({
  queryKey: ['interviews-upcoming'],
  queryFn: async () => { const r = await apiRequest<any>(API_ENDPOINTS.INTERVIEWS.UPCOMING); return r?.payload?.records || r?.payload || []; },
});

export const useCreateInterview = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(API_ENDPOINTS.INTERVIEWS.CREATE, { method: 'POST', body: JSON.stringify(data) }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['candidates'] }); qc.invalidateQueries({ queryKey: ['interviews'] }); } }); };

export const useUpdateInterview = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest(API_ENDPOINTS.INTERVIEWS.UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['candidates'] }); qc.invalidateQueries({ queryKey: ['interviews'] }); } }); };

export const useDeleteInterview = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => apiRequest(API_ENDPOINTS.INTERVIEWS.DELETE(id), { method: 'DELETE' }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['candidates'] }); qc.invalidateQueries({ queryKey: ['interviews'] }); } }); };
