import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { apiRequest } from '@/lib/queryClient';
import {
  useGetOrgAttendanceSummaryQuery,
  useGetOrgFilterOptionsQuery,
} from './attendanceService';

// Org-hierarchy filter cleanup (Attendance) — Business Unit -> Department
// -> Team -> Employee. Both hooks include their filter params in the React
// Query key, so a parent filter change (which the page also uses to clear
// invalid children) always produces a fresh cache entry and a real
// network refetch rather than serving stale data from a previous
// selection — same mechanism already relied on for CRM workspace
// switching elsewhere in this codebase.
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

describe('useGetOrgAttendanceSummaryQuery', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it('sends every non-empty filter as a query param', async () => {
    mockedApiRequest.mockResolvedValue({
      payload: { date: '2026-01-01', total_employees: 41, checked_in: 30, not_checked_in: 11, on_leave: 2, late: 3 },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => useGetOrgAttendanceSummaryQuery({ business_unit_id: 'bu-1', department_id: 'dept-1' }),
      { wrapper: makeWrapper(queryClient) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = mockedApiRequest.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('/attendance/org-summary?');
    expect(calledUrl).toContain('business_unit_id=bu-1');
    expect(calledUrl).toContain('department_id=dept-1');
    expect(result.current.data?.total_employees).toBe(41);
    expect(result.current.data?.on_leave).toBe(2);
    expect(result.current.data?.late).toBe(3);
  });

  it('omits empty-string filters from the request (never sends a widening blank param)', async () => {
    mockedApiRequest.mockResolvedValue({ payload: { total_employees: 0, checked_in: 0, not_checked_in: 0, on_leave: 0, late: 0 } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => useGetOrgAttendanceSummaryQuery({ business_unit_id: 'bu-1', department_id: '', team_id: '' }),
      { wrapper: makeWrapper(queryClient) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = mockedApiRequest.mock.calls[0]?.[0] as string;
    expect(calledUrl).not.toContain('department_id=');
    expect(calledUrl).not.toContain('team_id=');
  });

  it('a different filter combination produces a different query key, so switching Business Unit triggers a real refetch', async () => {
    mockedApiRequest.mockResolvedValue({ payload: { total_employees: 5, checked_in: 5, not_checked_in: 0, on_leave: 0, late: 0 } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, rerender } = renderHook(
      ({ bu }: { bu: string }) => useGetOrgAttendanceSummaryQuery({ business_unit_id: bu }),
      { wrapper: makeWrapper(queryClient), initialProps: { bu: 'bu-1' } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApiRequest).toHaveBeenCalledTimes(1);

    rerender({ bu: 'bu-2' });
    await waitFor(() => expect(mockedApiRequest).toHaveBeenCalledTimes(2));
    const secondUrl = mockedApiRequest.mock.calls[1]?.[0] as string;
    expect(secondUrl).toContain('business_unit_id=bu-2');
  });
});

describe('useGetOrgFilterOptionsQuery', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it('refetches dependent options when the parent business_unit_id changes', async () => {
    mockedApiRequest.mockResolvedValue({
      payload: { business_units: [], departments: [{ id: 'd1', name: 'Dept 1', business_unit_id: 'bu-1' }], teams: [], employees: [] },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, rerender } = renderHook(
      ({ bu }: { bu: string }) => useGetOrgFilterOptionsQuery({ business_unit_id: bu }),
      { wrapper: makeWrapper(queryClient), initialProps: { bu: 'bu-1' } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.departments).toEqual([{ id: 'd1', name: 'Dept 1', business_unit_id: 'bu-1' }]);

    mockedApiRequest.mockResolvedValue({
      payload: { business_units: [], departments: [{ id: 'd2', name: 'Dept 2', business_unit_id: 'bu-2' }], teams: [], employees: [] },
    });
    rerender({ bu: 'bu-2' });
    await waitFor(() =>
      expect(result.current.data?.departments).toEqual([{ id: 'd2', name: 'Dept 2', business_unit_id: 'bu-2' }]),
    );
    const secondUrl = mockedApiRequest.mock.calls[1]?.[0] as string;
    expect(secondUrl).toContain('business_unit_id=bu-2');
  });

  it('with no parent filters, still fetches the top-level Business Unit list', async () => {
    mockedApiRequest.mockResolvedValue({
      payload: { business_units: [{ id: 'bu-1', name: 'Engineering Sales' }], departments: [], teams: [], employees: [] },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useGetOrgFilterOptionsQuery(), { wrapper: makeWrapper(queryClient) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.business_units).toEqual([{ id: 'bu-1', name: 'Engineering Sales' }]);
  });
});
