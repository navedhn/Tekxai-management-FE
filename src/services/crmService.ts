import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api/apiRequest';

export interface CRMDashboard {
  upwork: { total: number; won: number; active: number; won_value: number };
  linkedin: { total: number; won: number; active: number; won_value: number };
  email: { total: number; won: number; active: number; won_value: number };
  deposits_this_month: number;
  hot_leads: {
    upwork: any[];
    linkedin: any[];
  };
  recent_won: any[];
  pipeline_summary: { total_leads: number; total_won_value: number };
}

export function useGetCRMDashboard() {
  return useQuery<CRMDashboard>({
    queryKey: ['crm-dashboard'],
    queryFn: () => apiRequest({ url: 'api/v1/crm/dashboard', method: 'GET' }),
  });
}

export function useGetTeamHierarchy() {
  return useQuery<any[]>({
    queryKey: ['crm-hierarchy'],
    queryFn: () => apiRequest({ url: 'api/v1/crm/hierarchy', method: 'GET' }),
  });
}

export function useAssignSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, supervisor_id }: { userId: string; supervisor_id: string | null }) =>
      apiRequest({ url: `api/v1/crm/users/${userId}/supervisor`, method: 'PATCH', data: { supervisor_id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-hierarchy'] }),
  });
}
