import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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
    queryFn: () => apiRequest<CRMDashboard>('api/v1/crm/dashboard'),
  });
}

export function useGetTeamHierarchy() {
  return useQuery<any[]>({
    queryKey: ['crm-hierarchy'],
    queryFn: () => apiRequest<any[]>('api/v1/crm/hierarchy'),
  });
}

export function useAssignSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, supervisor_id }: { userId: string; supervisor_id: string | null }) =>
      apiRequest<any>(`api/v1/crm/users/${userId}/supervisor`, {
        method: 'PATCH',
        body: JSON.stringify({ supervisor_id }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-hierarchy'] }),
  });
}
