import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, BASE_URL } from '@/lib/queryClient';

const v1 = 'api/v1';
const CD = `${v1}/client-documents`;
const PUBLIC_CD = `${v1}/public/client-documents`;

export type ClientNdaFieldType = 'NAME' | 'DATE' | 'SIGNATURE' | 'CNIC' | 'FILE_UPLOAD' | 'TEXT';
export type ClientNdaParty = 'CLIENT' | 'TEKXAI';
export type ClientNdaStatus =
  | 'DRAFT' | 'SENT_TO_CLIENT' | 'CLIENT_VIEWED' | 'TEKXAI_SIGNATURE_PENDING'
  | 'COMPLETED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';

export interface ClientNdaField {
  id: string;
  document_id: string;
  field_type: ClientNdaFieldType;
  label: string;
  party: ClientNdaParty;
  page_number: number;
  x: number; y: number; width: number; height: number;
  required: boolean;
  sort_order: number;
  value?: { value_text?: string | null; value_image?: string | null; value_file_key?: string | null; filled_at?: string | null } | null;
}

export interface ClientNdaFieldInput {
  field_type: ClientNdaFieldType;
  label: string;
  party: ClientNdaParty;
  page_number: number;
  x: number; y: number; width: number; height: number;
  required?: boolean;
}

export interface ClientDocument {
  id: string;
  title: string;
  status: ClientNdaStatus;
  client_account_id: string;
  project_id?: string | null;
  lead_id?: string | null;
  source_file_key?: string | null;
  page_count?: number | null;
  file_key?: string | null;
  client_signer_name?: string | null;
  client_signer_email?: string | null;
  tekxai_signer_user_id: string;
  sent_at?: string | null;
  client_viewed_at?: string | null;
  client_signed_at?: string | null;
  tekxai_signed_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  fields?: ClientNdaField[];
  signatures?: { id: string; party: ClientNdaParty; signer_name?: string | null; signed_at?: string | null }[];
}

// ── Admin ────────────────────────────────────────────────────────────────

export const useGetClientAccounts = () =>
  useQuery({
    queryKey: ['client-accounts-for-nda'],
    queryFn: async () => {
      const r = await apiRequest<any>(`${v1}/crm/customers`);
      const list = r?.payload;
      return (Array.isArray(list) ? list : list?.records || []) as { id: string; name: string; email?: string; contact_name?: string; company?: string }[];
    },
  });

export const useGetProjectsForClient = (clientId?: string) =>
  useQuery({
    queryKey: ['projects-for-nda', clientId],
    queryFn: async () => {
      const r = await apiRequest<any>(`${v1}/project?client_id=${clientId}`);
      const list = r?.payload;
      return (Array.isArray(list) ? list : list?.records || []) as { id: string; title: string }[];
    },
    enabled: !!clientId,
  });

export const useCreateClientNda = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; client_account_id: string; project_id?: string; tekxai_signer_user_id: string; client_signer_name?: string; client_signer_email?: string }) =>
      apiRequest<any>(CD, { method: 'POST', body: JSON.stringify(data) }).then((r) => r?.payload as ClientDocument),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-ndas'] }),
  });
};

export const useUpdateClientNda = () =>
  useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      apiRequest<any>(`${CD}/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then((r) => r?.payload as ClientDocument),
  });

export const useGetClientNdas = (filters: Record<string, any> = {}) =>
  useQuery({
    queryKey: ['client-ndas', filters],
    queryFn: async () => {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const qs = params.toString() ? `?${params.toString()}` : '';
      const r = await apiRequest<any>(`${CD}${qs}`);
      return r?.payload as { records: ClientDocument[]; total: number };
    },
  });

export const useGetClientNdaDetail = (id?: string) =>
  useQuery({
    queryKey: ['client-nda-detail', id],
    queryFn: async () => {
      const r = await apiRequest<any>(`${CD}/${id}`);
      return r?.payload as ClientDocument;
    },
    enabled: !!id,
  });

export const useUploadClientNdaPdf = () =>
  useMutation({
    mutationFn: async ({ documentId, file }: { documentId: string; file: File }) => {
      const token = localStorage.getItem('tekxai_access_token');
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BASE_URL}${CD}/${documentId}/upload-pdf`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Upload failed');
      return json.payload as ClientDocument;
    },
  });

export const useGetClientNdaFields = (documentId?: string) =>
  useQuery({
    queryKey: ['client-nda-fields', documentId],
    queryFn: async () => {
      const r = await apiRequest<any>(`${CD}/${documentId}/fields`);
      return (r?.payload || []) as ClientNdaField[];
    },
    enabled: !!documentId,
  });

export const useSaveClientNdaFields = () =>
  useMutation({
    mutationFn: ({ documentId, fields }: { documentId: string; fields: ClientNdaFieldInput[] }) =>
      apiRequest<any>(`${CD}/${documentId}/fields`, { method: 'PUT', body: JSON.stringify({ fields }) })
        .then((r) => r?.payload as ClientNdaField[]),
  });

export const useGetClientNdaPreview = (documentId?: string) =>
  useQuery({
    queryKey: ['client-nda-preview', documentId],
    queryFn: async () => {
      const r = await apiRequest<any>(`${CD}/${documentId}/preview`);
      return r?.payload as { document: ClientDocument; fields: ClientNdaField[]; file_url: string };
    },
    enabled: !!documentId,
  });

export const useSendClientNda = () =>
  useMutation({ mutationFn: (id: string) => apiRequest<any>(`${CD}/${id}/send`, { method: 'POST' }).then((r) => r?.payload as ClientDocument) });

export const useResendClientNda = () =>
  useMutation({ mutationFn: (id: string) => apiRequest<any>(`${CD}/${id}/resend`, { method: 'POST' }).then((r) => r?.payload as ClientDocument) });

export const useDeclineClientNda = () =>
  useMutation({ mutationFn: ({ id, reason }: { id: string; reason?: string }) => apiRequest<any>(`${CD}/${id}/decline`, { method: 'POST', body: JSON.stringify({ reason }) }) });

export const useCancelClientNda = () =>
  useMutation({ mutationFn: (id: string) => apiRequest<any>(`${CD}/${id}/cancel`, { method: 'POST' }) });

export const useGetClientNdaCompletedPdf = () =>
  useMutation({ mutationFn: (id: string) => apiRequest<any>(`${CD}/${id}/completed-pdf`).then((r) => r?.payload as { url: string; file_key: string }) });

// ── TekXAI signer ──────────────────────────────────────────────────────────

export const useGetTekxaiFields = (documentId?: string) =>
  useQuery({
    queryKey: ['client-nda-tekxai-fields', documentId],
    queryFn: async () => {
      const r = await apiRequest<any>(`${CD}/${documentId}/tekxai-fields`);
      return r?.payload as { document: ClientDocument; fields: ClientNdaField[]; file_url: string | null };
    },
    enabled: !!documentId,
  });

export const useTekxaiSign = () =>
  useMutation({
    mutationFn: ({ documentId, values }: { documentId: string; values: { field_id: string; value_text?: string; value_image?: string }[] }) =>
      apiRequest<any>(`${CD}/${documentId}/tekxai-sign`, { method: 'POST', body: JSON.stringify({ values }) })
        .then((r) => r?.payload as ClientDocument),
  });

// ── Public (client signing) ─────────────────────────────────────────────

export const useGetPublicClientNda = (token?: string) =>
  useQuery({
    queryKey: ['public-client-nda', token],
    queryFn: async () => {
      const r = await apiRequest<any>(`${PUBLIC_CD}/${token}`);
      return r?.payload as { document: { id: string; title: string; status: ClientNdaStatus }; fields: ClientNdaField[]; file_url: string | null };
    },
    enabled: !!token,
    retry: false,
  });

export const useClientSaveProgress = () =>
  useMutation({
    mutationFn: ({ token, values }: { token: string; values: { field_id: string; value_text?: string; value_image?: string; value_file_key?: string }[] }) =>
      apiRequest<any>(`${PUBLIC_CD}/${token}/save-progress`, { method: 'POST', body: JSON.stringify({ values }) })
        .then((r) => r?.payload as { saved: boolean; missing_fields: { id: string; label: string }[] }),
  });

export const useClientUploadFieldFile = () =>
  useMutation({
    mutationFn: async ({ token, fieldId, file }: { token: string; fieldId: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BASE_URL}${PUBLIC_CD}/${token}/fields/${fieldId}/upload`, { method: 'POST', body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Upload failed');
      return json.payload as { file_key: string };
    },
  });

export const useClientSubmit = () =>
  useMutation({
    mutationFn: ({ token, values }: { token: string; values: { field_id: string; value_text?: string; value_image?: string; value_file_key?: string }[] }) =>
      apiRequest<any>(`${PUBLIC_CD}/${token}/submit`, { method: 'POST', body: JSON.stringify({ values }) }),
  });
