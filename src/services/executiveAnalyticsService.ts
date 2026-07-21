import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

// Sprint 2 Milestone 1 — single hook for the (now-extended) executive
// dashboard endpoint. The backend composes this response purely from
// existing services + the generic report_builder KPI/aggregate engine; this
// hook does not transform/recompute anything, it just fetches + caches.
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
