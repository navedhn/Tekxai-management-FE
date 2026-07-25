// Thin "Contracts" view over the hr_documents engine (see hrDocumentsService.ts
// for the underlying generic HR-document hooks). Contracts is not a separate
// backend module anymore — it's hr_documents filtered to the three
// contract-relevant document types (Employment Contract / NDA / Consultancy
// Agreement). Exported names/shapes are kept stable so existing consumers
// (employee/documents, employee-profile ContractsSection) don't need changes.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import type { HrDocument } from './hrDocumentsService';

export const CONTRACT_TYPE_CODES = ['EMPLOYMENT_CONTRACT', 'NDA', 'CONSULTANCY_AGREEMENT'];

// Maps a raw hr_documents row onto the legacy `contracts` row shape
// (type/status/signed_at/signature_data as flat fields) that existing pages
// already render, while keeping the full hr_documents fields (signatures,
// template_version, previous_document, renewals, category, type object,
// etc.) alongside for the redesigned Contracts admin page to use.
function map_document_to_contract(doc: HrDocument) {
  const employeeSignature = (doc.signatures || []).find((s) => s.signer_role === 'EMPLOYEE' && s.signed_at);
  return {
    ...doc,
    type: doc.type?.code || 'GENERIC', // back-compat: plain string, as legacy contracts.type was
    type_name: doc.type?.name,
    signed_at: employeeSignature?.signed_at || null,
    signature_data: employeeSignature?.signature_data || null,
  };
}

function contract_type_filter_qs(extra?: Record<string, string | undefined>) {
  const params = new URLSearchParams({ type_code: CONTRACT_TYPE_CODES.join(',') });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
  }
  return params.toString();
}

export const useGetContracts = () =>
  useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const r = await apiRequest<any>(`${API_ENDPOINTS.HR_DOCUMENTS.LIST}?${contract_type_filter_qs({ limit: '200' })}`);
      const records = (r?.payload?.records || r?.payload || []) as HrDocument[];
      return records.map(map_document_to_contract);
    },
  });

// Backend supports ?user_id= (hr-documents list_documents_ctrl) — used by the
// employee-profile Contracts tab so admins see one employee's contracts
// rather than the global list.
export const useGetContractsByUser = (userId?: string) =>
  useQuery({
    queryKey: ['contracts', 'by-user', userId],
    queryFn: async () => {
      const r = await apiRequest<any>(`${API_ENDPOINTS.HR_DOCUMENTS.LIST}?${contract_type_filter_qs({ user_id: userId, limit: '200' })}`);
      const records = (r?.payload?.records || r?.payload || []) as HrDocument[];
      return records.map(map_document_to_contract);
    },
    enabled: !!userId,
  });

export const useGetTemplates = () =>
  useQuery({
    queryKey: ['contract-templates'],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.HR_DOCUMENTS.TEMPLATES);
      const templates = (r?.payload || []) as any[];
      return templates.filter((t) => CONTRACT_TYPE_CODES.includes(t.type?.code));
    },
  });

// New-contract creation now goes through generate_document — requires a
// category_id/type_id (resolved from `type` for back-compat callers) and
// either a template_id or raw_content.
export const useCreateContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiRequest(API_ENDPOINTS.HR_DOCUMENTS.GENERATE, {
        method: 'POST',
        body: JSON.stringify({
          user_id: data.user_id,
          category_id: data.category_id,
          type_id: data.type_id,
          template_id: data.template_id || undefined,
          raw_content: data.template_id ? undefined : data.content,
          title: data.title,
          valid_from: data.valid_from || undefined,
          valid_until: data.valid_until || undefined,
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  });
};

export const useSignContract = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (signature_data: string) =>
      apiRequest(API_ENDPOINTS.HR_DOCUMENTS.SIGN(id), {
        method: 'POST',
        body: JSON.stringify({ signer_role: 'EMPLOYEE', signature_data }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  });
};

export const useCreateTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiRequest(API_ENDPOINTS.HR_DOCUMENTS.TEMPLATES, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-templates'] }),
  });
};

// New hooks for the rebuilt Contracts page (renewals/approval/signing all
// reuse the generic hr-documents mutations directly — re-exported here so
// the Contracts page only needs one import).
export {
  useRenewDocument as useRenewContract,
  useApproveDraftDocument as useApproveContract,
  useSignDocument as useSignDocumentGeneric,
} from './hrDocumentsService';
