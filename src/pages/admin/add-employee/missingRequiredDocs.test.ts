import { describe, expect, it } from 'vitest';
import { missingRequiredDocs } from './index';

const doc = (document_type: string, file_url = 'https://example.com/f') =>
  ({ title: 't', document_type, file_url, notes: '' });

describe('missingRequiredDocs', () => {
  it('reports both CNIC sides missing when no documents exist', () => {
    expect(missingRequiredDocs([])).toEqual(['CNIC Front', 'CNIC Back']);
  });

  it('reports only the missing side when one is present', () => {
    expect(missingRequiredDocs([doc('CNIC_FRONT')])).toEqual(['CNIC Back']);
  });

  it('is satisfied once both sides have a non-empty file_url', () => {
    expect(missingRequiredDocs([doc('CNIC_FRONT'), doc('CNIC_BACK')])).toEqual([]);
  });

  it('does not count a CNIC row with an empty file_url as present', () => {
    expect(missingRequiredDocs([doc('CNIC_FRONT', ''), doc('CNIC_BACK')])).toEqual(['CNIC Front']);
  });

  it('does not count a CNIC row with a whitespace-only file_url as present', () => {
    expect(missingRequiredDocs([doc('CNIC_FRONT', '   '), doc('CNIC_BACK')])).toEqual(['CNIC Front']);
  });

  it('ignores unrelated document types entirely', () => {
    expect(missingRequiredDocs([doc('RESUME'), doc('OFFER_LETTER')])).toEqual(['CNIC Front', 'CNIC Back']);
  });
});
