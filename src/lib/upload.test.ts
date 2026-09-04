import { describe, expect, it, vi, beforeEach } from 'vitest';
import { API_ENDPOINTS } from '@/services/api/endpoints';

const apiRequestMock = vi.fn((endpoint: string, opts?: any) => Promise.resolve({ success: true, payload: { id: 'u1', avatar: 'https://api.example.com/signed', document_type: 'CNIC' } }));

vi.mock('@/lib/queryClient', () => ({
  apiRequest: (...args: any[]) => (apiRequestMock as any)(...args),
}));

import { uploadFile, uploadEmployeeAvatar, uploadEmployeeDocument } from '@/lib/upload';

describe('uploadEmployeeAvatar', () => {
  beforeEach(() => apiRequestMock.mockClear());

  it('calls the dedicated /user/:id/avatar endpoint, never the generic /storage/upload', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await uploadEmployeeAvatar('emp-1', file);
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    const [endpoint, opts] = apiRequestMock.mock.calls[0];
    expect(endpoint).toBe(API_ENDPOINTS.USER.AVATAR_UPLOAD('emp-1'));
    expect(endpoint).not.toBe(API_ENDPOINTS.STORAGE.UPLOAD);
    expect(opts.method).toBe('POST');
    expect(opts.body).toBeInstanceOf(FormData);
  });

  it('sends the file under the "file" multipart field', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await uploadEmployeeAvatar('emp-1', file);
    const fd = apiRequestMock.mock.calls[0][1].body as FormData;
    expect(fd.get('file')).toBe(file);
  });

  it('returns the resolved avatar from the response payload', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await uploadEmployeeAvatar('emp-1', file);
    expect(result.avatar).toBe('https://api.example.com/signed');
  });
});

describe('uploadEmployeeDocument', () => {
  beforeEach(() => apiRequestMock.mockClear());

  it('calls the dedicated /employee-doc/:userId/upload endpoint, never the generic /storage/upload', async () => {
    const file = new File(['x'], 'cnic.pdf', { type: 'application/pdf' });
    await uploadEmployeeDocument('emp-1', file, { document_type: 'CNIC', title: 'CNIC Front' });
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    const [endpoint, opts] = apiRequestMock.mock.calls[0];
    expect(endpoint).toBe(API_ENDPOINTS.EMPLOYEE_DOC.UPLOAD('emp-1'));
    expect(endpoint).not.toBe(API_ENDPOINTS.STORAGE.UPLOAD);
    expect(opts.body).toBeInstanceOf(FormData);
  });

  it('never sends a client-constructed S3 key/path — only file + canonical fields', async () => {
    const file = new File(['x'], 'cnic.pdf', { type: 'application/pdf' });
    await uploadEmployeeDocument('emp-1', file, { document_type: 'CNIC', title: 'CNIC Front', notes: 'front side' });
    const fd = apiRequestMock.mock.calls[0][1].body as FormData;
    const keys = Array.from(fd.keys());
    expect(keys.sort()).toEqual(['document_type', 'file', 'notes', 'title']);
    expect(keys.some((k) => /key|path|emp-/i.test(k))).toBe(false);
  });
});

describe('uploadFile (generic /storage/upload) — still used for non-employee uploads', () => {
  beforeEach(() => apiRequestMock.mockClear());

  it('still targets the generic endpoint (unrelated modules — CRM/assets/knowledge-base — are unaffected by this migration)', async () => {
    apiRequestMock.mockResolvedValueOnce({ success: true, payload: { file_url: 'https://x/y.png' } });
    const file = new File(['x'], 'y.png', { type: 'image/png' });
    await uploadFile(file);
    expect(apiRequestMock.mock.calls[0][0]).toBe(API_ENDPOINTS.STORAGE.UPLOAD);
  });
});
