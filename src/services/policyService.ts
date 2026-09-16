import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
const v1 = 'api/v1';
export const useGetPolicies = (opts?: { enabled?: boolean }) => useQuery({ queryKey: ['policies'], enabled: opts?.enabled !== false, queryFn: async () => { const r = await apiRequest<any>(`${v1}/policy`); return r?.payload?.records || r?.payload || []; } });
export const useGetMyAcks = (opts?: { enabled?: boolean }) => useQuery({ queryKey: ['policy-acks'], enabled: opts?.enabled !== false, queryFn: async () => { const r = await apiRequest<any>(`${v1}/policy/my-acknowledgements`); return r?.payload || []; } });
// `file` (optional) is sent as multipart when present — the backend's
// create_policy accepts either typed content, an uploaded document, or
// both. Without a file this still sends plain JSON, unchanged from before.
export const useCreatePolicy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; category: string; content: string; version: string; is_mandatory: boolean; file?: File | null }) => {
      const { file, ...rest } = data;
      if (file) {
        const fd = new FormData();
        Object.entries(rest).forEach(([k, v]) => fd.append(k, String(v)));
        fd.append('document', file);
        return apiRequest(`${v1}/policy`, { method: 'POST', body: fd });
      }
      return apiRequest(`${v1}/policy`, { method: 'POST', body: JSON.stringify(rest) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });
};
export const useGetPolicyFile = () => useMutation({ mutationFn: async (id: string) => { const r = await apiRequest<any>(`${v1}/policy/${id}/file`); return r?.payload as { url: string; file_name: string | null }; } });
export const useAcknowledgePolicy = (id: string) => { const qc = useQueryClient(); return useMutation({ mutationFn: () => apiRequest(`${v1}/policy/${id}/acknowledge`, { method: 'POST', body: '{}' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['policies', 'policy-acks'] }) }); };
export const usePublishPolicy = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => apiRequest(`${v1}/policy/${id}/publish`, { method: 'POST', body: '{}' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }) }); };
export const useUpdatePolicy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title: string; category: string; content: string; version: string; is_mandatory: boolean } }) =>
      apiRequest(`${v1}/policy/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });
};
