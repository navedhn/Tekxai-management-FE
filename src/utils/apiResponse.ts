import type { ApiListPayload, ApiResponse } from '@/types/api';

export function unwrapApiData<T>(res: unknown): T {
  if (!res || typeof res !== 'object') return res as T;
  const payload = (res as ApiResponse<T>).payload;
  return (payload ?? res) as T;
}

export function unwrapApiList<T>(res: unknown): T[] {
  if (!res || typeof res !== 'object') return [];
  const raw = (res as ApiResponse<ApiListPayload<T>>).payload ?? res;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && 'records' in raw) {
    const records = (raw as { records: unknown }).records;
    return Array.isArray(records) ? (records as T[]) : [];
  }
  return [];
}
