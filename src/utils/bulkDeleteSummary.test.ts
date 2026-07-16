import { describe, expect, it } from 'vitest';
import { summarizeBulkDelete } from './bulkDeleteSummary';

describe('summarizeBulkDelete', () => {
  it('reports full success with no error message', () => {
    const { successMessage, errorMessage, succeeded, failed } = summarizeBulkDelete(
      [{ id: '1', success: true }, { id: '2', success: true }],
      'department'
    );
    expect(successMessage).toBe('2 departments deleted');
    expect(errorMessage).toBeNull();
    expect(succeeded).toHaveLength(2);
    expect(failed).toHaveLength(0);
  });

  it('uses singular wording for exactly one success', () => {
    const { successMessage } = summarizeBulkDelete([{ id: '1', success: true }], 'division');
    expect(successMessage).toBe('1 division deleted');
  });

  it('reports partial success with a distinct error summary', () => {
    const { successMessage, errorMessage } = summarizeBulkDelete(
      [
        { id: '1', success: true },
        { id: '2', success: false, message: 'Cannot delete department: still referenced by 3 employee(s)' },
      ],
      'department'
    );
    expect(successMessage).toBe('1 of 2 departments deleted');
    expect(errorMessage).toContain('1 failed');
    expect(errorMessage).toContain('still referenced by 3 employee(s)');
  });

  it('resolves failed-item labels via the provided lookup function', () => {
    const { errorMessage } = summarizeBulkDelete(
      [{ id: 'div-1', success: false, message: 'blocked' }],
      'division',
      (id) => (id === 'div-1' ? 'Engineering' : id)
    );
    expect(errorMessage).toBe('1 failed: Engineering (blocked)');
  });

  it('falls back to the raw id when no lookup function is given', () => {
    const { errorMessage } = summarizeBulkDelete(
      [{ id: 'div-1', success: false, message: 'blocked' }],
      'division'
    );
    expect(errorMessage).toBe('1 failed: div-1 (blocked)');
  });
});
