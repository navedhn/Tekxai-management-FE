import { useQuery, useMutation } from '@tanstack/react-query';
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

// Executive Dashboard Email Report — recipients/preview/send, mirroring
// reportService.ts's projects-report email hooks exactly.
const EXEC_BASE = 'api/v1/executive-analytics';

export const useExecutiveDashboardEmailRecipients = () =>
  useQuery({
    queryKey: ['executive-dashboard', 'email-recipients'],
    queryFn: async () => {
      const r = await apiRequest<any>(`${EXEC_BASE}/email/recipients`);
      return r?.payload?.records || [];
    },
  });

export const useExecutiveDashboardEmailPreview = (params: Record<string, string>, enabled: boolean) =>
  useQuery({
    queryKey: ['executive-dashboard', 'email-preview', params],
    queryFn: async () => {
      const qs = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
      const r = await apiRequest<any>(`${EXEC_BASE}/email/preview${qs}`);
      return r?.payload as { subject: string; html: string };
    },
    enabled,
  });

export const useSendExecutiveDashboardEmail = () =>
  useMutation({
    mutationFn: (body: { recipient_ids?: string[]; extra_emails?: string[] } & Record<string, unknown>) =>
      apiRequest<any>(`${EXEC_BASE}/email/send`, { method: 'POST', body: JSON.stringify(body) }),
  });
