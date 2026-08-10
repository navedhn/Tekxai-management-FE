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
});
