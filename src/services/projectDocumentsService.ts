import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

export interface ProjectDocument {
  id: string;
  project_id: string;
  document_type: string;
  title: string;
  file_key: string | null;
  file_url: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  uploader?: { id: string; first_name: string; last_name: string; avatar?: string | null } | null;
}

async function fetchDocs(projectId: string): Promise<ProjectDocument[]> {
  const res = await apiRequest<any>(API_ENDPOINTS.PROJECT_DOCUMENTS.LIST(projectId));
  return (res?.payload?.records || res?.payload || res || []) as ProjectDocument[];
}

export function useProjectDocuments(projectId: string | null | undefined) {
  return useQuery<ProjectDocument[]>({
    queryKey: QUERY_KEYS.PROJECT_DOCUMENTS.LIST(projectId || ''),
    queryFn: () => fetchDocs(projectId!),
    enabled: !!projectId,
  });
}

export function useDocumentTypes(projectId: string | null | undefined) {
  return useQuery<{ value: string; label: string }[]>({
    queryKey: QUERY_KEYS.PROJECT_DOCUMENTS.TYPES(projectId || ''),
    queryFn: async () => {
      const res = await apiRequest<any>(API_ENDPOINTS.PROJECT_DOCUMENTS.TYPES(projectId!));
      return (res?.payload || []) as { value: string; label: string }[];
    },
    enabled: !!projectId,
    staleTime: Infinity,
  });
}

export function useCreateProjectDocument(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { document_type: string; title: string; file_url?: string; file_key?: string; notes?: string }) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.PROJECT_DOCUMENTS.CREATE(projectId), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT_DOCUMENTS.LIST(projectId || '') }),
  });
}

export function useDeleteProjectDocument(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => {
      if (!projectId) throw new Error('No projectId');
      return apiRequest<any>(API_ENDPOINTS.PROJECT_DOCUMENTS.DELETE(projectId, docId), { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT_DOCUMENTS.LIST(projectId || '') }),
  });
}
