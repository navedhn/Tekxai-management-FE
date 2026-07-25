import { describe, expect, it } from 'vitest';
import { missingRequiredDocs } from './index';

const doc = (document_type: string, file_url = 'https://example.com/f') =>
  ({ title: 't', document_type, file_url, notes: '' });

const ALL_REQUIRED = ['CNIC Front', 'CNIC Back', 'Police Verification', 'Employee Registration'];

describe('missingRequiredDocs', () => {
  it('reports all required documents missing when no documents exist', () => {
    expect(missingRequiredDocs([])).toEqual(ALL_REQUIRED);
  });

  it('reports only the missing ones when some are present', () => {
    expect(missingRequiredDocs([doc('CNIC_FRONT')])).toEqual(['CNIC Back', 'Police Verification', 'Employee Registration']);
  });

  it('is satisfied once all required types have a non-empty file_url', () => {
    expect(missingRequiredDocs([doc('CNIC_FRONT'), doc('CNIC_BACK'), doc('POLICE_VERIFICATION'), doc('EMPLOYEE_REGISTRATION')])).toEqual([]);
  });

  it('does not count a required row with an empty file_url as present', () => {
    expect(missingRequiredDocs([doc('CNIC_FRONT', ''), doc('CNIC_BACK'), doc('POLICE_VERIFICATION'), doc('EMPLOYEE_REGISTRATION')])).toEqual(['CNIC Front']);
  });

  it('does not count a required row with a whitespace-only file_url as present', () => {
    expect(missingRequiredDocs([doc('CNIC_FRONT', '   '), doc('CNIC_BACK'), doc('POLICE_VERIFICATION'), doc('EMPLOYEE_REGISTRATION')])).toEqual(['CNIC Front']);
  });

  it('ignores unrelated document types entirely', () => {
    expect(missingRequiredDocs([doc('RESUME'), doc('OFFER_LETTER')])).toEqual(ALL_REQUIRED);
  });

  it('treats a required type already on file (edit mode) as satisfied even with no new docFiles', () => {
    expect(missingRequiredDocs([], ['CNIC_FRONT', 'CNIC_BACK', 'POLICE_VERIFICATION', 'EMPLOYEE_REGISTRATION'])).toEqual([]);
  });

  it('still reports the ones that are neither newly added nor already on file', () => {
    expect(missingRequiredDocs([], ['CNIC_FRONT'])).toEqual(['CNIC Back', 'Police Verification', 'Employee Registration']);
  });
});
