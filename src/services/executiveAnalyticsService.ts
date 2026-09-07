import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

export const useGetExecutiveDashboard = (month?: number, year?: number) =>
  useQuery({
    queryKey: ['executive-dashboard', month, year],
    queryFn: () =>
      apiRequest<any>(
        `${API_ENDPOINTS.EXECUTIVE_ANALYTICS.DASHBOARD}?${new URLSearchParams({
          ...(month ? { month: String(month) } : {}),
          ...(year ? { year: String(year) } : {}),
        })}`
      ),
    select: (r: any) => r?.payload,
    staleTime: 60_000,
  });
