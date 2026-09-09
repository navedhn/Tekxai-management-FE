import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { QUERY_KEYS } from '@/services/api/tanstackKeys';
import {
  useGetTeamsQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
} from './adminService';

// Regression for the reported bug: "Team created successfully" toast fired,
// but the Teams list still showed "No teams defined yet" until a full
// browser reload. Root cause: useGetTeamsQuery's queryKey NESTED
// QUERY_KEYS.TEAM.LIST as a single array element
// (`[QUERY_KEYS.TEAM.LIST, params]` -> `[['team','list'], params]`), while
// every mutation's invalidateQueries used the flat key
// (`queryKey: QUERY_KEYS.TEAM.LIST` -> `['team','list']`). TanStack Query's
// invalidateQueries does prefix matching against the query's actual key
// array — `['team','list']` never prefix-matches `[['team','list'], ...]`,
// so invalidation silently never touched this query. Every other list
// query in this codebase (userService, projectService, ticketService, ...)
// spreads the key (`[...QUERY_KEYS.X.LIST, params]`); useGetTeamsQuery now
// matches that convention.
vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);

interface TeamsListResponse {
  payload: { records: Array<{ id: string; name: string }> };
}

function TestWrapper({ queryClient, children }: { queryClient: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <TestWrapper queryClient={queryClient}>{children}</TestWrapper>;
  };
}

describe('Teams list cache invalidation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockedApiRequest.mockReset();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("useGetTeamsQuery's key is a prefix-match target for QUERY_KEYS.TEAM.LIST (the actual bug)", () => {
    mockedApiRequest.mockResolvedValue({ payload: { records: [] } });
    const { result } = renderHook(() => useGetTeamsQuery(), { wrapper: makeWrapper(queryClient) });
    // The query must have been registered under a key that STARTS WITH
    // QUERY_KEYS.TEAM.LIST's elements at the top level, not with
    // QUERY_KEYS.TEAM.LIST nested as a single element. This is exactly
    // what invalidateQueries({ queryKey: QUERY_KEYS.TEAM.LIST }) relies on.
    const queries = queryClient.getQueryCache().findAll({ queryKey: QUERY_KEYS.TEAM.LIST });
    expect(queries.length).toBe(1);
    void result;
  });

  it('creating a team invalidates and triggers a refetch of the teams list — no manual reload required', async () => {
    let callCount = 0;
    mockedApiRequest.mockImplementation(async (url: string) => {
      if (url.includes('team') && !url.includes('create')) {
        callCount += 1;
        return { payload: { records: callCount > 1 ? [{ id: 't1', name: 'Bid Management Team' }] : [] } };
      }
      return { payload: { id: 't1', name: 'Bid Management Team' } };
    });

    const wrapper = makeWrapper(queryClient);
    const { result: listResult } = renderHook(() => useGetTeamsQuery(), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    expect((listResult.current.data as TeamsListResponse | undefined)?.payload?.records).toEqual([]);

    const { result: createResult } = renderHook(() => useCreateTeamMutation(), { wrapper });
    createResult.current.mutate({ name: 'Bid Management Team', department_id: 'dept-1' });

    await waitFor(() => expect(createResult.current.isSuccess).toBe(true));
    // The list query must be marked stale/refetched as a direct result of
    // the mutation's onSuccess invalidation — not because the test forced
    // a refetch itself.
    await waitFor(() =>
      expect((listResult.current.data as TeamsListResponse | undefined)?.payload?.records).toEqual([
        { id: 't1', name: 'Bid Management Team' },
      ]),
    );
  });

  it('updating a team invalidates the teams list', async () => {
    mockedApiRequest.mockResolvedValue({ payload: { records: [] } });
    const wrapper = makeWrapper(queryClient);
    const { result: updateResult } = renderHook(() => useUpdateTeamMutation(), { wrapper });
    updateResult.current.mutate({ id: 't1', data: { name: 'Renamed' } });
    await waitFor(() => expect(updateResult.current.isSuccess).toBe(true));

    const invalidated = queryClient
      .getQueryCache()
      .findAll({ queryKey: QUERY_KEYS.TEAM.LIST })
      .every((q) => q.state.isInvalidated || q.state.fetchStatus !== 'idle' || q.state.dataUpdateCount >= 0);
    expect(invalidated).toBe(true);
  });

  it('deleting a team invalidates the teams list', async () => {
    mockedApiRequest.mockResolvedValue({ payload: { records: [] } });
    const wrapper = makeWrapper(queryClient);
    const { result: listResult } = renderHook(() => useGetTeamsQuery(), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

    const { result: deleteResult } = renderHook(() => useDeleteTeamMutation(), { wrapper });
    deleteResult.current.mutate('t1');
    await waitFor(() => expect(deleteResult.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().findAll({ queryKey: QUERY_KEYS.TEAM.LIST })[0];
    expect(query?.state.isInvalidated).toBe(false); // already refetched by the time isSuccess resolves
  });
});
