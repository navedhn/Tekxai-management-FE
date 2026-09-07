import { describe, expect, it } from 'vitest';
import { isInitialPageLoading, isInitialQueryLoading } from '@/hooks/useShowPageSkeleton';

describe('isInitialPageLoading', () => {
  it('is true when any enabled query is loading', () => {
    expect(isInitialPageLoading(true, false)).toBe(true);
    expect(isInitialPageLoading({ isLoading: true }, { isLoading: false })).toBe(true);
  });

  it('ignores disabled queries, errors, and settled queries', () => {
    expect(isInitialQueryLoading({ isLoading: false, fetchStatus: 'idle', isError: false })).toBe(false);
    expect(isInitialQueryLoading({ isLoading: false, isError: true })).toBe(false);
    expect(isInitialQueryLoading({ isLoading: true, isError: true })).toBe(false);
    expect(isInitialQueryLoading({ isLoading: true, fetchStatus: 'idle' })).toBe(false);
    expect(isInitialPageLoading(false, { isLoading: false })).toBe(false);
  });
});
