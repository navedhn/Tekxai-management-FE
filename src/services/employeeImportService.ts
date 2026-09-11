import { useMutation } from '@tanstack/react-query';
import { apiRequest, BASE_URL } from '@/lib/queryClient';

const base = 'api/v1/employee-import';

// The CSV template is a real file download (Content-Disposition attachment),
// not JSON — same auth-header-then-blob pattern as reportService's
// download_report. Returns the .csv Blob for the caller to save.
export async function downloadEmployeeImportTemplate(): Promise<Blob> {
  const token = localStorage.getItem('tekxai_access_token');
  const res = await fetch(`${BASE_URL}${base}/template`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Could not download the CSV template');
  return res.blob();
}

// ── shapes returned by the backend (kept loose on purpose — the preview
// payload is large and only ever read field-by-field in the wizard) ────────
export interface ImportFieldState {
  mapped: boolean;
  header: string | null;
  active: boolean;
  sensitive: boolean;
  label: string;
  reason?: string;
}

export interface ImportChange {
  key: string;
  field: string;
  current: string | null;
  imported: string | null;
  sensitive?: boolean;
  append?: boolean;
}

export interface ImportRow {
  row: number;
  status: 'will_update' | 'no_change' | 'unmatched' | 'ambiguous' | 'invalid';
  email?: string;
  reason?: string;
  display_name?: string | null;
  match?: {
    method: string;
    erp_user_id: string;
    erp_name: string;
    erp_employee_id: string | null;
    confidence: string;
    is_active: boolean;
  };
  changes?: ImportChange[];
  resolutions?: Record<string, { source: string; status: string; name?: string; candidates?: any[] }>;
}

export interface ImportPreview {
  run_id: string;
  headers: string[];
  unmapped_headers: string[];
  fields: Record<string, ImportFieldState>;
  importer_can_bank: boolean;
  summary: {
    total_rows: number;
    matched: number;
    will_update: number;
    no_change: number;
    unmatched: number;
    ambiguous: number;
    invalid: number;
  };
  rows: ImportRow[];
}

export interface ImportCommitResult {
  run_id: string;
  status: 'COMMITTED';
  summary: {
    total_rows: number;
    updated: number;
    no_change: number;
    unmatched: number;
    ambiguous: number;
    skipped: number;
    failed: number;
  };
  rows: (ImportRow & { status: string })[];
}

export type FieldOverrides = Record<string, { active?: boolean; header?: string }>;
// manual row-level match: key = row's lowercased source email, or `row:<n>`;
// value = an ERP Employee ID / email / user id
export type RowMatches = Record<string, string>;

export function useEmployeeImportPreview() {
  return useMutation<ImportPreview, any, { file: File; overrides?: FieldOverrides; rowMatches?: RowMatches }>({
    mutationFn: ({ file, overrides, rowMatches }) => {
      const fd = new FormData();
      fd.append('file', file);
      const merged: Record<string, unknown> = { ...(overrides || {}) };
      if (rowMatches && Object.keys(rowMatches).length) merged.row_matches = rowMatches;
      if (Object.keys(merged).length) fd.append('overrides', JSON.stringify(merged));
      return apiRequest<any>(`${base}/preview`, { method: 'POST', body: fd }).then((r) => r?.payload);
    },
  });
}

export function useEmployeeImportCommit() {
  return useMutation<ImportCommitResult, any, { runId: string; file: File }>({
    mutationFn: ({ runId, file }) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiRequest<any>(`${base}/${runId}/commit`, { method: 'POST', body: fd }).then((r) => r?.payload);
    },
  });
}
