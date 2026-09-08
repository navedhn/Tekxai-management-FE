import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

export const useGetOffboardingTasks = (userId?: string) => useQuery({
  queryKey: ['offboarding-tasks', userId],
  queryFn: async () => { const r = await apiRequest<any>(API_ENDPOINTS.OFFBOARDING.TASKS(userId as string)); return r?.payload?.records || []; },
  enabled: !!userId,
});

export const useCreateOffboardingTask = (userId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest(API_ENDPOINTS.OFFBOARDING.CREATE_TASK, { method: 'POST', body: JSON.stringify({ ...data, user_id: userId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offboarding-tasks', userId] }),
  });
};

export const useCompleteOffboardingTask = (userId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(API_ENDPOINTS.OFFBOARDING.COMPLETE_TASK(id), { method: 'PATCH', body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offboarding-tasks', userId] }),
  });
};

export const useSetOffboardingTaskStatus = (userId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes, blocked_reason }: { id: string; status: string; notes?: string; blocked_reason?: string }) =>
      apiRequest(API_ENDPOINTS.OFFBOARDING.SET_TASK_STATUS(id), { method: 'PATCH', body: JSON.stringify({ status, notes, blocked_reason }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['offboarding-tasks', userId] }); qc.invalidateQueries({ queryKey: ['exit-detail', userId] }); },
  });
};

export const useGetExitDetail = (userId?: string) => useQuery({
  queryKey: ['exit-detail', userId],
  queryFn: async () => { const r = await apiRequest<any>(API_ENDPOINTS.OFFBOARDING.EXIT_DETAIL(userId as string)); return r?.payload; },
  enabled: !!userId,
});
