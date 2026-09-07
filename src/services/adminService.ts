import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

const getDashboardStatsApi = async () => {
  return apiRequest('packing-list/summary');
};

export const useGetDashboardStatsQuery = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStatsApi,
    enabled,
  });
};

export const useLazyGetDashboardStatsQuery = () => {
  const query = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStatsApi,
    enabled: false,
  });

  return {
    ...query,
    fetchStats: () => query.refetch(),
  };
};

export const useGetTeamsQuery = (params?: Record<string, any>, enabled: boolean = true) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TEAM.LIST, params],
    queryFn: () => {
      const filteredParams = params
        ? Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== ''))
        : {};

      const queryString = new URLSearchParams(filteredParams).toString();
      const url = queryString ? `${API_ENDPOINTS.TEAM.LIST}?${queryString}` : API_ENDPOINTS.TEAM.LIST;
      return apiRequest(url);
    },
    enabled,
  });
};

export const useDepartmentScopedTeams = (department_id?: string) => {
  const { data: teamsData } = useGetTeamsQuery(
    department_id ? { department_id } : undefined,
    !!department_id,
  );
  const teamRecords: any[] = Array.isArray((teamsData as any)?.payload?.records)
    ? (teamsData as any).payload.records
    : [];
  const teamOptions = teamRecords.map((t: any) => ({ value: t.id, label: t.name }));
  return { teamsData, teamRecords, teamOptions };
};

export const useCreateTeamMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest(API_ENDPOINTS.TEAM.CREATE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TEAM.LIST });
    },
  });
};

export const useUpdateTeamMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) =>
      apiRequest(API_ENDPOINTS.TEAM.UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TEAM.LIST });
    },
  });
};

export const useDeleteTeamMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => apiRequest(API_ENDPOINTS.TEAM.DELETE(id), { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TEAM.LIST });
    },
  });
};

export const useBulkDeleteTeamsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest(API_ENDPOINTS.TEAM.DELETE_MANY, { method: 'DELETE', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TEAM.LIST });
    },
  });
};
