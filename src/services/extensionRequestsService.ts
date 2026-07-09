import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

export type ExtensionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ExtensionRequestUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar?: string | null;
}

export interface ExtensionRequest {
  id: string;
  project_id: string;
  requested_by: string;
  current_deadline: string | null;
  proposed_deadline: string;
  reason: string;
  status: ExtensionRequestStatus;
  reviewed_by: string | null;
  review_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  requester?: ExtensionRequestUser | null;
  reviewer?: ExtensionRequestUser | null;
}

async function fetchExtensionRequests(projectId: string): Promise<ExtensionRequest[]> {
  const res = await apiRequest<any>(API_ENDPOINTS.PROJECT.EXTENSION(projectId));
  return (res?.payload || []) as ExtensionRequest[];
}

export function useExtensionRequests(projectId: string | null | undefined) {
  return useQuery<ExtensionRequest[]>({
    queryKey: QUERY_KEYS.EXTENSION_REQUESTS.LIST(projectId || ''),
    queryFn: () => fetchExtensionRequests(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateExtensionRequest(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { proposed_deadline: string; reason: string }) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.PROJECT.EXTENSION(projectId), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EXTENSION_REQUESTS.LIST(projectId || '') });
    },
  });
}

export function useReviewExtensionRequest(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, status, review_reason }: { requestId: string; status: 'APPROVED' | 'REJECTED'; review_reason?: string }) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.PROJECT.EXTENSION_REVIEW(projectId, requestId), {
        method: 'PATCH',
        body: JSON.stringify({ status, review_reason }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EXTENSION_REQUESTS.LIST(projectId || '') });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.DETAIL(projectId || '') });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT.LIST });
    },
  });
}
