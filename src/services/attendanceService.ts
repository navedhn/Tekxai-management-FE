import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, BASE_URL } from '@/lib/queryClient';

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

export interface NoCheckinFilters {
  date?: string;
  department_id?: string;
  team_id?: string;
  business_unit_id?: string;
  designation_id?: string;
  status?: string;
  employee_id?: string;
}

// Org-hierarchy filter cleanup (Attendance dashboard) — Business Unit ->
// Department -> Team -> Employee, same filter shape as NoCheckinFilters
// (minus date/designation/status, which the summary block doesn't need)
// so a single filter-state object on the page can drive both this and the
// No-Check-In list without duplicating shape.
export interface OrgFilters {
  business_unit_id?: string;
  department_id?: string;
  team_id?: string;
  employee_id?: string;
}

export interface OrgAttendanceSummary {
  date: string;
  total_employees: number;
  checked_in: number;
  not_checked_in: number;
  on_leave: number;
  late: number;
}

export const useGetOrgAttendanceSummaryQuery = (filters?: OrgFilters & { date?: string }) =>
  useQuery({
    queryKey: ['attendance-org-summary', filters],
    queryFn: async () => {
      const qs = filters ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== '')) as any).toString() : '';
      const r = await apiRequest<any>(`${v1}/attendance/org-summary${qs}`);
      return (r?.payload || { total_employees: 0, checked_in: 0, not_checked_in: 0, on_leave: 0, late: 0 }) as OrgAttendanceSummary;
    },
    staleTime: 30000,
  });

export interface OrgFilterOption {
  id: string;
  name: string;
}

export interface OrgFilterOptions {
  business_units: OrgFilterOption[];
  departments: (OrgFilterOption & { business_unit_id: string | null })[];
  teams: (OrgFilterOption & { department_id: string | null })[];
  employees: (OrgFilterOption & { employee_id: string | null })[];
}

// Dependent options for the same hierarchy — refetches whenever a parent
// filter changes (business_unit_id/department_id/team_id are part of the
// query key), so switching a parent always gets fresh, correctly-scoped
// child options rather than stale ones from the previous selection.
export const useGetOrgFilterOptionsQuery = (parents?: Pick<OrgFilters, 'business_unit_id' | 'department_id' | 'team_id'>) =>
  useQuery({
    queryKey: ['attendance-org-filter-options', parents],
    queryFn: async () => {
      const qs = parents ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(parents).filter(([, v]) => v != null && v !== '')) as any).toString() : '';
      const r = await apiRequest<any>(`${v1}/attendance/org-filter-options${qs}`);
      return (r?.payload || { business_units: [], departments: [], teams: [], employees: [] }) as OrgFilterOptions;
    },
    staleTime: 30000,
  });

export const useGetNoCheckinsQuery = (filters?: NoCheckinFilters) =>
  useQuery({
    queryKey: ['no-checkins', filters],
    queryFn: async () => {
      const qs = filters ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== '')) as any).toString() : '';
      const r = await apiRequest<any>(`${v1}/attendance/no-checkins${qs}`);
      return r?.payload || { date: filters?.date, records: [], total: 0, summary: { total_employees: 0, checked_in: 0, not_checked_in: 0 } };
    },
    staleTime: 30000,
  });

export async function exportNoCheckinPdf(filters?: NoCheckinFilters) {
  const qs = filters ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== '')) as any).toString() : '';
  const token = localStorage.getItem('tekxai_access_token');
  const res = await fetch(`${BASE_URL}${v1}/attendance/no-checkins/export-pdf${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to generate PDF');
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `No_Check_In_Report_${filters?.date || new Date().toISOString().split('T')[0]}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

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
