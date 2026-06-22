import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';

// ── Upwork Bids ───────────────────────────────────────────────────────────────

export const useGetUpworkBids = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['marketing', 'upwork', params],
    queryFn: async () => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      const res = await apiRequest<any>(`${API_ENDPOINTS.MARKETING.UPWORK}${qs}`);
      return res?.payload || { records: [], total: 0 };
    },
    staleTime: 30000,
  });

export const useCreateUpworkBid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest<any>(API_ENDPOINTS.MARKETING.UPWORK, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing', 'upwork'] }),
  });
};

export const useUpdateUpworkBid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest<any>(API_ENDPOINTS.MARKETING.UPWORK_ITEM(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing', 'upwork'] }),
  });
};

export const useDeleteUpworkBid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<any>(API_ENDPOINTS.MARKETING.UPWORK_ITEM(id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing', 'upwork'] }),
  });
};

// ── LinkedIn Leads ────────────────────────────────────────────────────────────

export const useGetLinkedinLeads = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['marketing', 'linkedin', params],
    queryFn: async () => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      const res = await apiRequest<any>(`${API_ENDPOINTS.MARKETING.LINKEDIN}${qs}`);
      return res?.payload || { records: [], total: 0 };
    },
    staleTime: 30000,
  });

export const useCreateLinkedinLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest<any>(API_ENDPOINTS.MARKETING.LINKEDIN, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing', 'linkedin'] }),
  });
};

export const useUpdateLinkedinLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest<any>(API_ENDPOINTS.MARKETING.LINKEDIN_ITEM(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing', 'linkedin'] }),
  });
};

export const useDeleteLinkedinLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<any>(API_ENDPOINTS.MARKETING.LINKEDIN_ITEM(id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing', 'linkedin'] }),
  });
};

// ── Email Leads ───────────────────────────────────────────────────────────────

export const useGetEmailLeads = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['marketing', 'email-leads', params],
    queryFn: async () => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      const res = await apiRequest<any>(`${API_ENDPOINTS.MARKETING.EMAIL_LEADS}${qs}`);
      return res?.payload || { records: [], total: 0 };
    },
    staleTime: 30000,
  });

export const useCreateEmailLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest<any>(API_ENDPOINTS.MARKETING.EMAIL_LEADS, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing', 'email-leads'] }),
  });
};

export const useUpdateEmailLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest<any>(API_ENDPOINTS.MARKETING.EMAIL_LEADS_ITEM(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing', 'email-leads'] }),
  });
};

export const useDeleteEmailLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<any>(API_ENDPOINTS.MARKETING.EMAIL_LEADS_ITEM(id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing', 'email-leads'] }),
  });
};

// ── Won Deals (combined) ──────────────────────────────────────────────────────

export const useGetWonDealsLeads = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['marketing', 'won-deals-leads', params],
    queryFn: async () => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      const res = await apiRequest<any>(`${API_ENDPOINTS.MARKETING.WON_DEALS}${qs}`);
      return res?.payload || { records: [], total: 0 };
    },
    staleTime: 30000,
  });

// ── Deposits ──────────────────────────────────────────────────────────────────

export const useGetDeposits = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['marketing', 'deposits', params],
    queryFn: async () => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      const res = await apiRequest<any>(`${API_ENDPOINTS.MARKETING.DEPOSITS}${qs}`);
      return res?.payload || { records: [], total: 0 };
    },
    staleTime: 30000,
  });

export const useCreateDeposit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest<any>(API_ENDPOINTS.MARKETING.DEPOSITS, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing', 'deposits'] }),
  });
};

export const useUpdateDeposit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest<any>(API_ENDPOINTS.MARKETING.DEPOSIT_ITEM(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing', 'deposits'] }),
  });
};

export const useDeleteDeposit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<any>(API_ENDPOINTS.MARKETING.DEPOSIT_ITEM(id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing', 'deposits'] }),
  });
};

// ── Targets ───────────────────────────────────────────────────────────────────

export const useGetTargets = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['marketing', 'targets', params],
    queryFn: async () => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      const res = await apiRequest<any>(`${API_ENDPOINTS.MARKETING.TARGETS}${qs}`);
      return res?.payload || [];
    },
    staleTime: 60000,
  });

export const useUpsertTarget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest<any>(API_ENDPOINTS.MARKETING.TARGETS, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing', 'targets'] }),
  });
};

// ── My Activity Report ────────────────────────────────────────────────────────

export const useGetMyReport = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['marketing', 'my-report', params],
    queryFn: async () => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      const res = await apiRequest<any>(`${API_ENDPOINTS.MARKETING.MY_REPORT}${qs}`);
      return res?.payload || { upwork: [], linkedin: [], email: [], linkedin_activity: [] };
    },
    staleTime: 30000,
  });

// ── My Salaries ───────────────────────────────────────────────────────────────

export const useGetMySalaries = () =>
  useQuery({
    queryKey: ['marketing', 'my-salaries'],
    queryFn: async () => {
      const res = await apiRequest<any>(API_ENDPOINTS.MARKETING.MY_SALARIES);
      return res?.payload || [];
    },
    staleTime: 60000,
  });
