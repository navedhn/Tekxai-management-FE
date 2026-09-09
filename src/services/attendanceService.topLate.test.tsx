import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { apiRequest } from '@/lib/queryClient';
import { useGetTopLateEmployeesQuery } from './attendanceService';

// Overview -> Top Late Employees — replaces the unscoped generic Report
// Builder aggregate with a dedicated Attendance endpoint. Same
// org-hierarchy filter shape (business_unit_id/department_id/team_id/
// employee_id) as the rest of attendanceService.ts's org-filter hooks.
vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useGetTopLateEmployeesQuery', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it('sends every non-empty org filter as a query param', async () => {
    mockedApiRequest.mockResolvedValue({ payload: [] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => useGetTopLateEmployeesQuery({
        business_unit_id: 'bu-1',
        department_id: 'dept-1',
        team_id: 'team-1',
        employee_id: 'emp-1',
      }),
      { wrapper: makeWrapper(queryClient) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = mockedApiRequest.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('/attendance/top-late-employees?');
    expect(calledUrl).toContain('business_unit_id=bu-1');
    expect(calledUrl).toContain('department_id=dept-1');
    expect(calledUrl).toContain('team_id=team-1');
    expect(calledUrl).toContain('employee_id=emp-1');
  });

  it('omits empty-string filters (never sends a widening blank param)', async () => {
    mockedApiRequest.mockResolvedValue({ payload: [] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => useGetTopLateEmployeesQuery({ business_unit_id: 'bu-1', department_id: '', team_id: '' }),
      { wrapper: makeWrapper(queryClient) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = mockedApiRequest.mock.calls[0]?.[0] as string;
    expect(calledUrl).not.toContain('department_id=');
    expect(calledUrl).not.toContain('team_id=');
  });

  it('changing an org filter produces a new query key, triggering a real refetch — no stale results from a previous selection', async () => {
    mockedApiRequest.mockResolvedValue({ payload: [{ user_id: 'u1', user: { id: 'u1', first_name: 'A', last_name: 'B', avatar: null }, count: 1, total_late_minutes: 10 }] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, rerender } = renderHook(
      ({ dept }: { dept: string }) => useGetTopLateEmployeesQuery({ department_id: dept }),
      { wrapper: makeWrapper(queryClient), initialProps: { dept: 'dept-1' } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApiRequest).toHaveBeenCalledTimes(1);

    rerender({ dept: 'dept-2' });
    await waitFor(() => expect(mockedApiRequest).toHaveBeenCalledTimes(2));
    const secondUrl = mockedApiRequest.mock.calls[1]?.[0] as string;
    expect(secondUrl).toContain('department_id=dept-2');
  });

  it('parses the ranked {user_id, user, count, total_late_minutes} response shape', async () => {
    mockedApiRequest.mockResolvedValue({
      payload: [{ user_id: 'u1', user: { id: 'u1', first_name: 'Hubaba', last_name: 'Ali', avatar: null }, count: 3, total_late_minutes: 45 }],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useGetTopLateEmployeesQuery({ department_id: 'dept-1' }), { wrapper: makeWrapper(queryClient) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      { user_id: 'u1', user: { id: 'u1', first_name: 'Hubaba', last_name: 'Ali', avatar: null }, count: 3, total_late_minutes: 45 },
    ]);
  });
});
