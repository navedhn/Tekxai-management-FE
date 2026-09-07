import { useRef } from 'react';

type QueryLike = {
  isLoading?: boolean;
  isError?: boolean;
  fetchStatus?: string;
};

export function isInitialQueryLoading(query: QueryLike | boolean | undefined): boolean {
  if (query == null) return false;
  if (typeof query === 'boolean') return query;
  if (query.isError) return false;
  if (query.fetchStatus === 'idle') return false;
  return Boolean(query.isLoading);
}

export function isInitialPageLoading(...queries: Array<QueryLike | boolean | undefined>): boolean {
  return queries.some(isInitialQueryLoading);
}

export function useShowPageSkeleton(...queries: Array<QueryLike | boolean | undefined>): boolean {
  const isLoading = isInitialPageLoading(...queries);
  const hasLoadedRef = useRef(false);
  if (!isLoading) hasLoadedRef.current = true;
  return isLoading && !hasLoadedRef.current;
}
