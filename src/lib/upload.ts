import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

export interface UploadFileResult {
  file_url: string;
  [key: string]: any;
}

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

export async function uploadEmployeeAvatar(userId: string, file: File): Promise<any> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await apiRequest<any>(API_ENDPOINTS.USER.AVATAR_UPLOAD(userId), {
    method: 'POST',
    body: fd,
  });
  return res?.payload ?? res;
}

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
