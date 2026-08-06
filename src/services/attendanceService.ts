import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const v1 = 'api/v1';

export const useGetShiftsQuery = () =>
  useQuery({ queryKey: ['shifts'], queryFn: async () => { const r = await apiRequest<any>(`${v1}/attendance/shifts`); return r?.payload || []; }, staleTime: 60000 });

export const useGetViolationsQuery = (params?: Record<string,any>) =>
  useQuery({ queryKey: ['violations', params], queryFn: async () => { const qs = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null&&v!=''))).toString() : ''; const r = await apiRequest<any>(`${v1}/attendance/violations${qs}`); return r?.payload || { records: [], total: 0 }; }, staleTime: 30000 });

export const useGetMyShiftQuery = () =>
  useQuery({ queryKey: ['my-shift'], queryFn: async () => { const r = await apiRequest<any>(`${v1}/attendance/my-shift`); return r?.payload; }, staleTime: 60000 });

export const useGetMyAttendanceSummary = (params?: { start_date?: string; end_date?: string; user_id?: string }, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['attendance-summary', params],
    queryFn: async () => {
      const qs = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== '')) as any).toString() : '';
      const r = await apiRequest<any>(`${v1}/attendance/my-summary${qs}`);
      return r?.payload;
    },
    staleTime: 60000,
    enabled: options?.enabled,
  });

// Employee Timesheets (admin browser) — a distinct endpoint from
// useGetWeeklyTimesheet (timesheetService.ts), not a reimplementation of
// it: Today/Yesterday/This Week/Last Week resolve server-side to the exact
// same week-shaped rows that endpoint already returns for the logged-in
// user's own week; This Month/Last Month/Custom return the same row shape
// for an arbitrary range instead.
export const useGetEmployeeTimesheet = (params: { user_id: string; period: string; start_date?: string; end_date?: string }, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['employee-timesheet', params],
    queryFn: async () => {
      const qs = '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== '')) as any).toString();
      const r = await apiRequest<any>(`${v1}/attendance/employee-timesheet${qs}`);
      return r?.payload;
    },
    staleTime: 30000,
    enabled: options?.enabled ?? !!params.user_id,
  });

export const useUpsertShiftMutation = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(`${v1}/attendance/shifts`, { method: 'POST', body: JSON.stringify(data) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }) }); };

export const useAssignShiftMutation = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => apiRequest(`${v1}/attendance/shifts/assign`, { method: 'POST', body: JSON.stringify(data) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }) }); };

export const useDeleteShiftMutation = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => apiRequest(`${v1}/attendance/shifts/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }) }); };

// "Didn't check in today" — active employees with no timesheet_entries row
// and no approved leave for the given day. Distinct from useGetViolationsQuery
// (which only reads already-recorded LATE/ABSENT/EARLY_OUT rows): this is a
// live, computed no-show list for a day nobody has been marked absent for yet.
export const useGetNoCheckinsQuery = (filters?: { date?: string; department_id?: string; team_id?: string }) =>
  useQuery({
    queryKey: ['no-checkins', filters],
    queryFn: async () => {
      const qs = filters ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== '')) as any).toString() : '';
      const r = await apiRequest<any>(`${v1}/attendance/no-checkins${qs}`);
      return r?.payload || { date: filters?.date, records: [], total: 0 };
    },
    staleTime: 30000,
  });

// Turns the no-checkins list into real ABSENT violation rows (idempotent —
// safe to click more than once for the same day).
export const useMarkAbsenteesMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date?: string) => apiRequest<any>(`${v1}/attendance/mark-absentees`, { method: 'POST', body: JSON.stringify({ date }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['violations'] });
      qc.invalidateQueries({ queryKey: ['no-checkins'] });
    },
  });
};
