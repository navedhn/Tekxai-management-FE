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

// Direct-to-private-S3 avatar upload for an EXISTING employee (already has
// an employee_id) — the dedicated POST /user/:id/avatar endpoint, not the
// generic uploadFile() above. Returns the updated user record (payload.avatar
// is already a resolved, short-lived presigned URL — never persist it as a
// permanent reference, it's re-resolved fresh on every subsequent read).
export async function uploadEmployeeAvatar(userId: string, file: File): Promise<any> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await apiRequest<any>(API_ENDPOINTS.USER.AVATAR_UPLOAD(userId), {
    method: 'POST',
    body: fd,
  });
  return res?.payload ?? res;
}

// Direct-to-private-S3 employee-document upload — POST /employee-doc/:userId/upload.
// The backend derives the S3 key (Emp-{employeeId}/documents/{category}/...)
// from `document_type`; the frontend never constructs or sends a storage
// path/key itself.
export async function uploadEmployeeDocument(
  userId: string,
  file: File,
  fields: { document_type?: string; title?: string; notes?: string; expiry_date?: string },
): Promise<any> {
  const fd = new FormData();
  fd.append('file', file);
  if (fields.document_type) fd.append('document_type', fields.document_type);
  if (fields.title) fd.append('title', fields.title);
  if (fields.notes) fd.append('notes', fields.notes);
  if (fields.expiry_date) fd.append('expiry_date', fields.expiry_date);
  const res = await apiRequest<any>(API_ENDPOINTS.EMPLOYEE_DOC.UPLOAD(userId), {
    method: 'POST',
    body: fd,
  });
  return res?.payload ?? res;
}
