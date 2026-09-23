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
// Backend enforces this as SUPER_ADMIN-only (bare role gate, not a
// grantable Access Control permission) — see policies.routes.js's DELETE
// gate. The frontend button is hidden the same way as a UX nicety, but the
// real enforcement is server-side.
export const useDeletePolicy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`${v1}/policy/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });
};

// ── Phase 2 — Audience targeting ────────────────────────────────────────────
export type PolicyTarget = { id?: string; target_type: 'all' | 'business_unit' | 'department' | 'team' | 'user'; target_value: string };

export const useGetPolicyTargets = (id: string | null) =>
  useQuery<PolicyTarget[]>({
    queryKey: ['policy-targets', id],
    enabled: !!id,
    queryFn: async () => { const r = await apiRequest<any>(`${v1}/policy/${id}/targets`); return r?.payload || []; },
  });

export const useSetPolicyTargets = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targets }: { id: string; targets: Array<{ target_type: string; target_value: string }> }) =>
      apiRequest(`${v1}/policy/${id}/targets`, { method: 'POST', body: JSON.stringify({ targets }) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['policy-targets', vars.id] });
      qc.invalidateQueries({ queryKey: ['policies'] });
    },
  });
};

// ── Phase 3 — Acknowledgement status (HR/management reporting) ─────────────
export type PolicyAcknowledgementStatus = {
  policy: { id: string; title: string; policy_number: string; version: string; is_mandatory: boolean };
  required_count: number;
  acknowledged_count: number;
  pending_count: number;
  percentage: number;
  acknowledged_employees: Array<{ user_id: string; name: string; email: string; acknowledged_at: string }>;
  pending_employees: Array<{ user_id: string; name: string; email: string }>;
};

export const useGetPolicyAcknowledgementStatus = (id: string | null) =>
  useQuery<PolicyAcknowledgementStatus | null>({
    queryKey: ['policy-ack-status', id],
    enabled: !!id,
    queryFn: async () => { const r = await apiRequest<any>(`${v1}/policy/${id}/acknowledgement-status`); return r?.payload || null; },
  });

// ── Versioning / lifecycle ──────────────────────────────────────────────────
export const useCreatePolicyVersion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: string; data: { title?: string; category?: string; content?: string; version?: string; is_mandatory?: boolean }; file?: File | null }) => {
      if (file) {
        const fd = new FormData();
        Object.entries(data).forEach(([k, v]) => { if (v !== undefined) fd.append(k, String(v)); });
        fd.append('document', file);
        return apiRequest(`${v1}/policy/${id}/new-version`, { method: 'POST', body: fd });
      }
      return apiRequest(`${v1}/policy/${id}/new-version`, { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });
};

export const useArchivePolicy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`${v1}/policy/${id}/archive`, { method: 'POST', body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });
};
