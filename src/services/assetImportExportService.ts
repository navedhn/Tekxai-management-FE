import { BASE_URL, apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('tekxai_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadAssetExport(opts: {
  format: 'xlsx' | 'csv';
  category_id?: string;
}) {
  const params = new URLSearchParams({ format: opts.format });
  if (opts.category_id) params.set('category_id', opts.category_id);
  const res = await fetch(`${BASE_URL}${API_ENDPOINTS.ASSET.EXPORT}?${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Asset export failed');
  const blob = await res.blob();
  triggerDownload(blob, `assets-export.${opts.format === 'csv' ? 'csv' : 'xlsx'}`);
}

/** Phase 2A — related-domain read-only exports (separate from Phase 1 master I/O). */
export type RelatedAssetExportKind =
  | 'custody'
  | 'disposals'
  | 'replacements'
  | 'depreciation'
  | 'maintenance';

const RELATED_EXPORT_PATH: Record<RelatedAssetExportKind, string> = {
  custody: API_ENDPOINTS.ASSET.EXPORT_CUSTODY,
  disposals: API_ENDPOINTS.ASSET.EXPORT_DISPOSALS,
  replacements: API_ENDPOINTS.ASSET.EXPORT_REPLACEMENTS,
  depreciation: API_ENDPOINTS.ASSET.EXPORT_DEPRECIATION,
  maintenance: API_ENDPOINTS.ASSET.EXPORT_MAINTENANCE,
};

const RELATED_EXPORT_FILENAME: Record<RelatedAssetExportKind, string> = {
  custody: 'custody-events-export',
  disposals: 'disposals-export',
  replacements: 'replacements-export',
  depreciation: 'depreciation-report',
  maintenance: 'maintenance-export',
};

export async function downloadRelatedAssetExport(opts: {
  kind: RelatedAssetExportKind;
  format: 'xlsx' | 'csv';
  event_type?: string;
  asset_id?: string;
}) {
  const params = new URLSearchParams({ format: opts.format });
  if (opts.event_type) params.set('event_type', opts.event_type);
  if (opts.asset_id) params.set('asset_id', opts.asset_id);
  const res = await fetch(`${BASE_URL}${RELATED_EXPORT_PATH[opts.kind]}?${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `${opts.kind} export failed`);
  }
  const blob = await res.blob();
  const ext = opts.format === 'csv' ? 'csv' : 'xlsx';
  triggerDownload(blob, `${RELATED_EXPORT_FILENAME[opts.kind]}.${ext}`);
}

export async function downloadAssetImportTemplate(format: 'xlsx' | 'csv') {
  const res = await fetch(`${BASE_URL}${API_ENDPOINTS.ASSET.IMPORT_TEMPLATE}?format=${format}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Could not download import template');
  const blob = await res.blob();
  triggerDownload(blob, `assets-import-template.${format === 'csv' ? 'csv' : 'xlsx'}`);
}

export interface AssetImportPreview {
  total_rows: number;
  new_assets: number;
  existing_assets: number;
  unchanged: number;
  errors: number;
  unknown_headers?: string[];
  columns: string[];
  rows: Array<{
    row: number;
    action: 'create' | 'update' | 'unchanged' | 'error';
    asset_id: string | null;
    asset_tag: string | null;
    name: string | null;
    errors: Array<{ row: number; field: string; value: string; error: string }>;
    diffs?: Array<{ field: string; key: string; current: string; imported: string }>;
  }>;
}

export interface AssetImportCommitResult {
  success: boolean;
  message?: string;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  skipped: number;
  successful: number;
  preview?: AssetImportPreview;
  error_rows?: Array<{ row: number; field: string; value: string; error: string }>;
  row_results?: Array<{ row: number; action: string; asset_id?: string; errors?: any[] }>;
}

export async function previewAssetImport(file: File): Promise<AssetImportPreview> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiRequest<any>(API_ENDPOINTS.ASSET.IMPORT_PREVIEW, {
    method: 'POST',
    body: form as any,
  });
  return res?.payload as AssetImportPreview;
}

export async function commitAssetImport(file: File): Promise<AssetImportCommitResult> {
  const form = new FormData();
  form.append('file', file);
  const token = localStorage.getItem('tekxai_access_token');
  const res = await fetch(`${BASE_URL}${API_ENDPOINTS.ASSET.IMPORT_COMMIT}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok && !json?.payload) {
    throw new Error(json?.message || 'Import commit failed');
  }
  return (json?.payload || json) as AssetImportCommitResult;
}

export async function downloadAssetImportErrorReport(
  errors: Array<{ row: number; field: string; value: string; error: string }>,
  format: 'xlsx' | 'csv' = 'xlsx',
) {
  const token = localStorage.getItem('tekxai_access_token');
  const res = await fetch(`${BASE_URL}${API_ENDPOINTS.ASSET.IMPORT_ERROR_REPORT}?format=${format}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ errors }),
  });
  if (!res.ok) throw new Error('Could not download error report');
  const blob = await res.blob();
  triggerDownload(blob, `assets-import-errors.${format === 'csv' ? 'csv' : 'xlsx'}`);
}
