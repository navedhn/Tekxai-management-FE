import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, BASE_URL } from '@/lib/queryClient';

const v1 = 'api/v1';
const NDA = `${v1}/hr-documents/nda`;

export type NdaFieldType = 'NAME' | 'DATE' | 'SIGNATURE' | 'CNIC' | 'FILE_UPLOAD';

export interface NdaField {
  id: string;
  template_version_id: string;
  field_type: NdaFieldType;
  label: string;
  signer_role: 'EMPLOYEE' | 'HR' | 'COMPANY';
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  sort_order: number;
  value?: {
    value_text?: string | null;
    value_image?: string | null;
    value_file_key?: string | null;
    filled_at?: string | null;
  } | null;
}

export interface NdaFieldInput {
  field_type: NdaFieldType;
  label: string;
  signer_role?: 'EMPLOYEE' | 'HR' | 'COMPANY';
  page_number: number;
  x: number; y: number; width: number; height: number;
  required?: boolean;
}

// ── Admin: upload template PDF ────────────────────────────────────────────

export const useUploadTemplatePdf = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, file }: { templateId: string; file: File }) => {
      const token = localStorage.getItem('tekxai_access_token');
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BASE_URL}${NDA}/templates/${templateId}/upload-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Upload failed');
      return json.payload as { id: string; template_id: string; version: number; page_count: number; source_file_key: string };
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['hr-document-template', vars.templateId] }),
  });
};

// ── Admin: fields ──────────────────────────────────────────────────────────

export const useGetFields = (versionId?: string) =>
  useQuery({
    queryKey: ['nda-fields', versionId],
    queryFn: async () => {
      const r = await apiRequest<any>(`${NDA}/template-versions/${versionId}/fields`);
      return (r?.payload || []) as NdaField[];
    },
    enabled: !!versionId,
  });

export const useSaveFields = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, fields }: { versionId: string; fields: NdaFieldInput[] }) =>
      apiRequest<any>(`${NDA}/template-versions/${versionId}/fields`, {
        method: 'PUT', body: JSON.stringify({ fields }),
      }).then((r) => r?.payload as NdaField[]),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['nda-fields', vars.versionId] }),
  });
};

// ── Admin: preview ─────────────────────────────────────────────────────────

export const useGetTemplatePreview = (templateId?: string) =>
  useQuery({
    queryKey: ['nda-template-preview', templateId],
    queryFn: async () => {
      const r = await apiRequest<any>(`${NDA}/templates/${templateId}/preview`);
      return r?.payload as { template: any; version: any; fields: NdaField[]; file_url: string };
    },
    enabled: !!templateId,
  });

// ── Admin: publish ─────────────────────────────────────────────────────────

export const usePublishNda = () =>
  useMutation({
    mutationFn: ({ templateId, ...data }: { templateId: string; user_ids: string[]; category_id: string; type_id: string; title?: string }) =>
      apiRequest<any>(`${NDA}/templates/${templateId}/publish`, { method: 'POST', body: JSON.stringify(data) })
        .then((r) => r?.payload as { assigned: { user_id: string; document_id: string }[]; failed: { user_id: string; message: string }[] }),
  });

// ── Employee portal ────────────────────────────────────────────────────────

export const useGetDocumentFields = (documentId?: string) =>
  useQuery({
    queryKey: ['nda-document-fields', documentId],
    queryFn: async () => {
      const r = await apiRequest<any>(`${NDA}/documents/${documentId}/fields`);
      return r?.payload as { document: any; fields: NdaField[] };
    },
    enabled: !!documentId,
  });

export interface NdaValueInput {
  field_id: string;
  value_text?: string | null;
  value_image?: string | null;
  value_file_key?: string | null;
}

export const useSaveNdaProgress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, values }: { documentId: string; values: NdaValueInput[] }) =>
      apiRequest<any>(`${NDA}/documents/${documentId}/save-progress`, { method: 'POST', body: JSON.stringify({ values }) })
        .then((r) => r?.payload as { saved: boolean; missing_fields: { id: string; label: string }[] }),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['nda-document-fields', vars.documentId] }),
  });
};

export const useUploadNdaFieldFile = () =>
  useMutation({
    mutationFn: async ({ documentId, fieldId, file }: { documentId: string; fieldId: string; file: File }) => {
      const token = localStorage.getItem('tekxai_access_token');
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BASE_URL}${NDA}/documents/${documentId}/fields/${fieldId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Upload failed');
      return json.payload as { file_key: string };
    },
  });

export const useSubmitNda = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, values }: { documentId: string; values: NdaValueInput[] }) =>
      apiRequest<any>(`${NDA}/documents/${documentId}/submit`, { method: 'POST', body: JSON.stringify({ values }) })
        .then((r) => r?.payload),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['nda-document-fields', vars.documentId] });
      qc.invalidateQueries({ queryKey: ['hr-documents-list'] });
    },
  });
};

// ── Completed document (admin + owner) ────────────────────────────────────

export const useGetCompletedNdaPdf = () =>
  useMutation({
    mutationFn: (documentId: string) =>
      apiRequest<any>(`${NDA}/documents/${documentId}/completed-pdf`)
        .then((r) => r?.payload as { url: string; file_key: string }),
  });
