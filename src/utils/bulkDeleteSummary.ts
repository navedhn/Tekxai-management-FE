import type { BulkDeleteResult } from '@/services/departmentService';

// Shared success/error summary formatting for bulk-delete results, so
// Departments and Divisions report partial failures identically.
export function summarizeBulkDelete(
  results: BulkDeleteResult[],
  entityLabel: string,
  getLabel?: (id: string) => string
) {
  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  const successMessage = failed.length === 0
    ? `${succeeded.length} ${entityLabel}${succeeded.length === 1 ? '' : 's'} deleted`
    : `${succeeded.length} of ${results.length} ${entityLabel}s deleted`;

  const errorMessage = failed.length > 0
    ? `${failed.length} failed: ${failed.map(f => `${getLabel ? getLabel(f.id) : f.id} (${f.message || 'unknown error'})`).join('; ')}`
    : null;

  return { succeeded, failed, successMessage, errorMessage };
}
