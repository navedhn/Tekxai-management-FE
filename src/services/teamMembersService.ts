import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';

export const useGetTeamMembers = (teamId: string | null | undefined) =>
  useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.TEAM.MEMBERS(teamId!));
      return r?.payload?.records || r?.payload || [];
    },
    enabled: !!teamId,
  });

export const useAddTeamMember = (teamId: string | null | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { user_id: string; role?: string }) =>
      apiRequest<any>(API_ENDPOINTS.TEAM.MEMBERS(teamId!), { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members', teamId] }),
  });
};

export const useRemoveTeamMember = (teamId: string | null | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiRequest<any>(API_ENDPOINTS.TEAM.MEMBER(teamId!, userId), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members', teamId] }),
  });
};
