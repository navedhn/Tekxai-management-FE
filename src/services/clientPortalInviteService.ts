import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const v1 = 'api/v1';

export function usePreviewClientPortalInvite(token: string) {
  return useQuery({
    queryKey: ['client-portal-invite-preview', token],
    queryFn: () => apiRequest<any>(`${v1}/public/client-portal-invites/${token}/preview`),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptClientPortalInvite(token: string) {
  return useMutation({
    mutationFn: (data: { password: string; first_name?: string; last_name?: string }) =>
      apiRequest<any>(`${v1}/public/client-portal-invites/${token}/accept`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}
