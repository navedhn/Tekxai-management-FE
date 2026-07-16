import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

export interface UploadFileResult {
  file_url: string;
  [key: string]: any;
}

/**
 * Shared file-upload helper. Routes through `apiRequest` so uploads get the
 * same token handling + 401-refresh-retry behavior as every other API call —
 * previously each call site (add-employee, ProjectDocumentsPanel,
 * financial-reports) re-implemented auth-token retrieval independently via
 * raw `fetch()`, with no refresh handling.
 */
export async function uploadFile(file: File): Promise<UploadFileResult> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await apiRequest<any>(API_ENDPOINTS.STORAGE.UPLOAD, {
    method: 'POST',
    body: fd,
  });
  const payload = res?.payload ?? res;
  if (!payload?.file_url) {
    throw new Error('Upload failed: no file_url returned');
  }
  return payload as UploadFileResult;
}
