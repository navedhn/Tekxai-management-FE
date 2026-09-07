import { describe, expect, it } from 'vitest';
import { missingRequiredDocs } from './index';

const doc = (document_type: string, file_url = 'https://example.com/f') =>
  ({ title: 't', document_type, file_url, notes: '' });

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

  it('treats a pending (not-yet-uploaded) file as satisfying the requirement, same as file_url', () => {
    const pendingFile = { title: 't', document_type: 'CNIC', file_url: '', notes: '', file: new File(['x'], 'cnic.pdf') };
    expect(missingRequiredDocs([pendingFile])).toEqual([]);
  });
});
