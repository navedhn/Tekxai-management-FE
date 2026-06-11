import { describe, expect, it } from 'vitest';
import { unwrapApiData, unwrapApiList } from './apiResponse';

describe('unwrapApiData', () => {
  it('returns payload when present', () => {
    expect(unwrapApiData({ payload: { id: '1' } })).toEqual({ id: '1' });
  });

  it('returns raw object when payload is missing', () => {
    expect(unwrapApiData({ id: '2' })).toEqual({ id: '2' });
  });
});

describe('unwrapApiList', () => {
  it('unwraps payload.records arrays', () => {
    expect(unwrapApiList({ payload: { records: [{ id: 'a' }] } })).toEqual([{ id: 'a' }]);
  });

  it('unwraps direct payload arrays', () => {
    expect(unwrapApiList({ payload: [{ id: 'b' }] })).toEqual([{ id: 'b' }]);
  });

  it('returns empty array for invalid input', () => {
    expect(unwrapApiList(null)).toEqual([]);
    expect(unwrapApiList({ payload: { records: 'bad' } })).toEqual([]);
  });
});
