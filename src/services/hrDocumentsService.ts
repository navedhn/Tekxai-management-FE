import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';

// ── Types ─────────────────────────────────────────────────────────────────

export interface DocumentCategory {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
  _count?: { document_types: number; templates: number };
}

export interface DocumentType {
  id: string;
  category_id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
  category?: { id: string; name: string; code: string };
  _count?: { templates: number };
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  version: number;
  content: string;
  placeholders: string[];
  created_by?: string | null;
  created_at: string;
}

export interface DocumentTemplate {
  id: string;
  category_id: string;
  type_id: string;
  name: string;
  is_active: boolean;
  current_version_id: string | null;
  current_version?: TemplateVersion | null;
  category?: { id: string; name: string; code: string };
  type?: { id: string; name: string; code: string };
  created_at: string;
  updated_at: string;
}

export type DocumentStatus =
  | 'DRAFT' | 'GENERATED' | 'SENT' | 'VIEWED' | 'SIGNED'
  | 'REJECTED' | 'CANCELLED' | 'EXPIRED' | 'ARCHIVED';

export interface DocumentSignature {
  id: string;
  document_id: string;
  signer_role: 'EMPLOYEE' | 'HR' | 'COMPANY';
  signer_user_id?: string | null;
  signature_data?: string | null;
  signed_at?: string | null;
  ip_address?: string | null;
}

export interface HrDocument {
  id: string;
  user_id: string;
  category_id: string;
  type_id: string;
  template_id?: string | null;
  template_version_id?: string | null;
  title: string;
  content: string;
  status: DocumentStatus;
  file_key?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  cancelled_at?: string | null;
  archived_at?: string | null;
  previous_document_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  user?: { id: string; first_name: string; last_name: string; email: string; avatar?: string | null };
  category?: { id: string; name: string; code: string };
  type?: { id: string; name: string; code: string };
  template?: { id: string; name: string } | null;
  template_version?: { id: string; version: number } | null;
  signatures?: DocumentSignature[];
  previous_document?: { id: string; title: string; created_at: string } | null;
  renewals?: { id: string; title: string; status: DocumentStatus; created_at: string }[];
}

export interface PlaceholderDef { token: string; group: string; label: string; }

// ── Placeholder registry ─────────────────────────────────────────────────

export const useGetPlaceholderRegistry = () =>
  useQuery({
    queryKey: ['hr-documents', 'placeholders'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.HR_DOCUMENTS.PLACEHOLDERS);
      return r?.payload as { placeholders: PlaceholderDef[]; statuses: DocumentStatus[]; signer_roles: string[] };
    },
    staleTime: 300000,
  });

// ── Categories ────────────────────────────────────────────────────────────

export const useGetDocumentCategories = (includeInactive = false) =>
  useQuery({
    queryKey: ['hr-document-categories', includeInactive],
    queryFn: async () => {
      const qs = includeInactive ? '?include_inactive=true' : '';
      const r = await apiRequest<any>(`${API_ENDPOINTS.HR_DOCUMENTS.CATEGORIES}${qs}`);
      return (r?.payload || []) as DocumentCategory[];
    },
    staleTime: 60000,
  });

export const useCreateDocumentCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; name: string; description?: string; sort_order?: number }) =>
      apiRequest(API_ENDPOINTS.HR_DOCUMENTS.CATEGORIES, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-document-categories'] }),
  });
};

export const useUpdateDocumentCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest(API_ENDPOINTS.HR_DOCUMENTS.CATEGORY_UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-document-categories'] }),
  });
};

// ── Document Types ────────────────────────────────────────────────────────

export const useGetDocumentTypes = (categoryId?: string, includeInactive = false) =>
  useQuery({
    queryKey: ['hr-document-types', categoryId || 'all', includeInactive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryId) params.set('category_id', categoryId);
      if (includeInactive) params.set('include_inactive', 'true');
      const qs = params.toString() ? `?${params.toString()}` : '';
      const r = await apiRequest<any>(`${API_ENDPOINTS.HR_DOCUMENTS.TYPES}${qs}`);
      return (r?.payload || []) as DocumentType[];
    },
    staleTime: 60000,
  });

export const useCreateDocumentType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { category_id: string; code: string; name: string; description?: string; sort_order?: number }) =>
      apiRequest(API_ENDPOINTS.HR_DOCUMENTS.TYPES, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-document-types'] }),
  });
};

export const useUpdateDocumentType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest(API_ENDPOINTS.HR_DOCUMENTS.TYPE_UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-document-types'] }),
  });
};

// ── Templates ─────────────────────────────────────────────────────────────

export const useGetTemplates = (categoryId?: string, typeId?: string, includeInactive = false) =>
  useQuery({
    queryKey: ['hr-document-templates', categoryId || 'all', typeId || 'all', includeInactive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryId) params.set('category_id', categoryId);
      if (typeId) params.set('type_id', typeId);
      if (includeInactive) params.set('include_inactive', 'true');
      const qs = params.toString() ? `?${params.toString()}` : '';
      const r = await apiRequest<any>(`${API_ENDPOINTS.HR_DOCUMENTS.TEMPLATES}${qs}`);
      return (r?.payload || []) as DocumentTemplate[];
    },
    staleTime: 30000,
  });

export const useGetTemplateDetail = (id?: string) =>
  useQuery({
    queryKey: ['hr-document-template', id],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.HR_DOCUMENTS.TEMPLATE_DETAIL(id!));
      return r?.payload as DocumentTemplate;
    },
    enabled: !!id,
  });

export const useGetTemplateVersions = (id?: string) =>
  useQuery({
    queryKey: ['hr-document-template-versions', id],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.HR_DOCUMENTS.TEMPLATE_VERSIONS(id!));
      return (r?.payload || []) as TemplateVersion[];
    },
    enabled: !!id,
  });

export const useCreateTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { category_id: string; type_id: string; name: string; content: string; placeholders?: string[] }) =>
      apiRequest(API_ENDPOINTS.HR_DOCUMENTS.TEMPLATES, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-document-templates'] }),
  });
};

export const useUpdateTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest(API_ENDPOINTS.HR_DOCUMENTS.TEMPLATE_UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_d, variables: any) => {
      qc.invalidateQueries({ queryKey: ['hr-document-templates'] });
      qc.invalidateQueries({ queryKey: ['hr-document-template', variables.id] });
      qc.invalidateQueries({ queryKey: ['hr-document-template-versions', variables.id] });
    },
  });
};

// ── Preview render (no persistence) ──────────────────────────────────────

export const usePreviewRender = () =>
  useMutation({
    mutationFn: (data: { content: string; user_id: string }) =>
      apiRequest<any>(API_ENDPOINTS.HR_DOCUMENTS.PREVIEW_RENDER, { method: 'POST', body: JSON.stringify(data) })
        .then((r) => r?.payload as { rendered: string; unresolved: string[] }),
  });

// ── Documents ─────────────────────────────────────────────────────────────

export const useGetDocuments = (filters: Record<string, any> = {}) =>
  useQuery({
    queryKey: ['hr-documents-list', filters],
    queryFn: async () => {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== ''))
      );
      const qs = params.toString() ? `?${params.toString()}` : '';
      const r = await apiRequest<any>(`${API_ENDPOINTS.HR_DOCUMENTS.LIST}${qs}`);
      return (r?.payload || { records: [], total: 0 }) as { records: HrDocument[]; total: number; page: number; limit: number };
    },
  });

export const useGetDocumentDetail = (id?: string) =>
  useQuery({
    queryKey: ['hr-document-detail', id],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.HR_DOCUMENTS.DETAIL(id!));
      return r?.payload as HrDocument;
    },
    enabled: !!id,
  });

const invalidate_document_lists = (qc: ReturnType<typeof useQueryClient>, id?: string) => {
  qc.invalidateQueries({ queryKey: ['hr-documents-list'] });
  if (id) qc.invalidateQueries({ queryKey: ['hr-document-detail', id] });
};

export const useGenerateDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      user_id: string; category_id: string; type_id: string;
      template_id?: string; raw_content?: string; title?: string;
      valid_from?: string; valid_until?: string;
    }) => apiRequest<any>(API_ENDPOINTS.HR_DOCUMENTS.GENERATE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => invalidate_document_lists(qc),
  });
};

export const useRenewDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest<any>(API_ENDPOINTS.HR_DOCUMENTS.RENEW(id), { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_d, variables: any) => invalidate_document_lists(qc, variables.id),
  });
};

function make_status_mutation(endpoint: (id: string) => string) {
  return () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, ...data }: any) =>
        apiRequest<any>(endpoint(id), { method: 'POST', body: JSON.stringify(data || {}) }),
      onSuccess: (_d, variables: any) => invalidate_document_lists(qc, variables.id),
    });
  };
}

export const useSendDocument = make_status_mutation(API_ENDPOINTS.HR_DOCUMENTS.SEND);
export const useViewDocument = make_status_mutation(API_ENDPOINTS.HR_DOCUMENTS.VIEW);
export const useRejectDocument = make_status_mutation(API_ENDPOINTS.HR_DOCUMENTS.REJECT);
export const useCancelDocument = make_status_mutation(API_ENDPOINTS.HR_DOCUMENTS.CANCEL);
export const useArchiveDocument = make_status_mutation(API_ENDPOINTS.HR_DOCUMENTS.ARCHIVE);

// Lazily generates (server-side, cached after first call) and returns a
// presigned/download URL for the document's PDF — call `.mutateAsync()` on
// click rather than a `useQuery`, since the first call may render the PDF.
export const useGetDocumentPdf = () =>
  useMutation({
    mutationFn: (id: string) =>
      apiRequest<any>(API_ENDPOINTS.HR_DOCUMENTS.PDF(id), { method: 'GET' })
        .then((r) => r?.payload as { url: string; file_key: string }),
  });

export const useSignDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; signer_role: 'EMPLOYEE' | 'HR' | 'COMPANY'; signature_data: string; required_roles?: string[] }) =>
      apiRequest<any>(API_ENDPOINTS.HR_DOCUMENTS.SIGN(id), { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_d, variables: any) => invalidate_document_lists(qc, variables.id),
  });
};
