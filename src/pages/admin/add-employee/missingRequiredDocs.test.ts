import { describe, expect, it } from 'vitest';
import { missingRequiredDocs } from './index';

const doc = (document_type: string, file_url = 'https://example.com/f') =>
  ({ title: 't', document_type, file_url, notes: '' });

// CNIC Front, CNIC Back, Police Verification, and Employee Registration are
// no longer mandatory before the wizard can proceed — REQUIRED_DOC_TYPES is
// now empty, so missingRequiredDocs always reports nothing missing.
describe('missingRequiredDocs', () => {
  it('reports nothing missing when no documents exist', () => {
    expect(missingRequiredDocs([])).toEqual([]);
  });

  it('reports nothing missing regardless of which documents are present', () => {
    expect(missingRequiredDocs([doc('CNIC_FRONT')])).toEqual([]);
  });

  it('reports nothing missing when unrelated document types are present', () => {
    expect(missingRequiredDocs([doc('RESUME'), doc('OFFER_LETTER')])).toEqual([]);
  });

  it('reports nothing missing in edit mode regardless of existingTypes', () => {
    expect(missingRequiredDocs([], [])).toEqual([]);
  });

  // Deferred-upload sequencing: a row with a pending, not-yet-uploaded File
  // (before the employee record exists) must satisfy the same requirement
  // an already-uploaded file_url would — the wizard doesn't actually upload
  // to S3 until after employee creation, so file_url is empty at this point
  // even though a real file IS attached.
  it('treats a pending (not-yet-uploaded) file as satisfying the requirement, same as file_url', () => {
    const pendingFile = { title: 't', document_type: 'CNIC', file_url: '', notes: '', file: new File(['x'], 'cnic.pdf') };
    expect(missingRequiredDocs([pendingFile])).toEqual([]);
  });
});
