/**
 * Employee Service — Real API Implementation
 * Replaces all mock data with actual backend calls.
 * BUG-005 (mock data) FIXED.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';
import type { ActivityPreviewVariant } from '@/components/dashboard/ActivityPreview';

// Re-export types the pages import
export interface DashboardStats {
  completedProjects: number;
  totalHours: number;
  overdueProjects: number;
  latestCheckIn: string;
  pendingTimesheets: number;
}

export interface Activity {
  id: string;
  title: string;
  progress: number;
  image?: string;
  preview?: ActivityPreviewVariant;
  updatedAt?: string;
}

export interface TimesheetEntry {
  id: string;
  employee: string;
  date: string;
  checkIn: string;
  checkOut: string;
  duration: string;
  status: 'Completed' | 'Pending' | 'Overdue' | 'In Progress';
}

export interface ProjectSummary {
  id: string;
  title: string;
  members: string[];
  hours: number;
  progress: number;
  status: string;
  dueDate: string;
  isOverdue: boolean;
  daysRemaining: number | null;
  clientName: string | null;
  devStatus: string | null;
  pendingMilestonesCount: number;
}

export interface MemberProfile {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  avatar: string;
  status: 'Online' | 'Offline';
  lastSeen: string;
  workingHours: { day: string; hours: string; percent: number }[];
  totalProjects: number;
}

// ── Stats (derived from real project + timesheet data) ──────────────────────

async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const [projectsRes, timesheetRes] = await Promise.all([
      apiRequest<any>(API_ENDPOINTS.PROJECT.LIST + '?limit=200'),
      apiRequest<any>(API_ENDPOINTS.TIMESHEET.WEEKLY),
    ]);

    const projects = projectsRes?.payload?.records || projectsRes?.payload || [];
    const timesheet = timesheetRes?.payload || timesheetRes || {};
    const rows: any[] = timesheet?.rows || [];

    const completed = Array.isArray(projects) ? projects.filter((p: any) => p.status === 'COMPLETED').length : 0;
    const overdue   = Array.isArray(projects) ? projects.filter((p: any) => p.status === 'OVERDUE').length : 0;
    const total_hours = Array.isArray(projects) ? projects.reduce((s: number, p: any) => s + (p.total_hours || 0), 0) : 0;
    const today_row = rows.find((r: any) => r.has_entry);

    return {
      completedProjects: completed,
      totalHours: total_hours,
      overdueProjects: overdue,
      latestCheckIn: today_row?.check_in || 'No entry today',
      pendingTimesheets: rows.filter((r: any) => !r.has_entry).length,
    };
  } catch {
    return { completedProjects: 0, totalHours: 0, overdueProjects: 0, latestCheckIn: '—', pendingTimesheets: 0 };
  }
}

async function fetchRecentActivity(): Promise<Activity[]> {
  try {
    const res = await apiRequest<any>(API_ENDPOINTS.PROJECT.LIST + '?limit=4&status=IN_PROGRESS');
    const records = res?.payload?.records || res?.payload || [];
    return (Array.isArray(records) ? records : []).map((p: any, i: number) => ({
      id: p.id,
      title: p.title,
      progress: p.progress || 0,
      preview: (['stats', 'projects', 'tracker', 'timesheet'] as ActivityPreviewVariant[])[i % 4],
      updatedAt: p.updated_at ? new Date(p.updated_at).toLocaleString() : undefined,
    }));
  } catch {
    return [];
  }
}

async function fetchTimesheet(): Promise<TimesheetEntry[]> {
  try {
    const res = await apiRequest<any>(API_ENDPOINTS.TIMESHEET.WEEKLY);
    const rows: any[] = res?.payload?.rows || res?.rows || [];
    return rows
      .filter((r: any) => r.has_entry)
      .map((r: any) => ({
        id: r.entry_id || r.day_date,
        employee: r.employee || 'Me',
        date: r.day_label || r.day_date,
        checkIn: r.check_in || 'No entry',
        checkOut: r.check_out || '—',
        duration: r.duration_label || '—',
        status: (r.status_label || 'Completed') as TimesheetEntry['status'],
      }));
  } catch {
    return [];
  }
}

async function fetchProjects(): Promise<ProjectSummary[]> {
  try {
    // limit: 1000 — the projects page paginates client-side over the full list,
    // so all assigned projects must be loaded up front (not just the first 20).
    const res = await apiRequest<any>(API_ENDPOINTS.PROJECT.LIST + '?limit=1000');
    const records = res?.payload?.records || res?.payload || [];
    return (Array.isArray(records) ? records : []).map((p: any) => ({
      id: p.id,
      title: p.title,
      members: (p.members || []).map((m: any) => m.first_name?.[0] || 'U'),
      hours: p.total_hours || 0,
      progress: p.progress || 0,
      status: p.status || 'PENDING',
      dueDate: p.end_date ? new Date(p.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD',
      isOverdue: !!p.is_overdue,
      daysRemaining: typeof p.days_remaining === 'number' ? p.days_remaining : null,
      clientName: p.client_name || null,
      devStatus: p.dev_status || null,
      pendingMilestonesCount: p.pending_milestones_count || 0,
    }));
  } catch {
    return [];
  }
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export const useGetDashboardStats = () =>
  useQuery({ queryKey: QUERY_KEYS.EMPLOYEE.DASHBOARD_STATS, queryFn: fetchDashboardStats, staleTime: 60000 });

export const useGetRecentActivity = () =>
  useQuery({ queryKey: QUERY_KEYS.EMPLOYEE.RECENT_ACTIVITY, queryFn: fetchRecentActivity, staleTime: 60000 });

export const useGetTimesheet = () =>
  useQuery({ queryKey: QUERY_KEYS.EMPLOYEE.TIMESHEET, queryFn: fetchTimesheet, staleTime: 60000 });

export const useGetProjects = () =>
  useQuery({ queryKey: QUERY_KEYS.EMPLOYEE.PROJECTS, queryFn: fetchProjects, staleTime: 60000 });

export const useGetMemberProfile = (id: string | undefined) =>
  useQuery({
    queryKey: QUERY_KEYS.EMPLOYEE.MEMBER_PROFILE(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await apiRequest<any>(API_ENDPOINTS.USER.DETAIL(id));
      const u = res?.payload || res;
      return {
        id: u.id,
        firstName: u.first_name || '',
        lastName: u.last_name || '',
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
        email: u.email,
        phone: u.phone || 'Not provided',
        department: u.department || 'General',
        position: u.designation || u.position || 'Staff',
        role: u.role_name || u.role?.name || 'Employee',
        avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.first_name + '+' + u.last_name)}&background=005CDA&color=fff`,
        status: u.status === 'ACTIVE' ? 'Online' : 'Offline',
        lastSeen: 'Recently active',
        workingHours: [],
        totalProjects: 0,
      } as MemberProfile;
    },
    enabled: !!id,
    staleTime: 120000,
  });

// ── Employee Directory (new backend endpoint) ────────────────────────────────
export const useGetEmployeeDirectory = (filters: Record<string, any> = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
  return useQuery({
    queryKey: ['employee-directory', filters],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.EMPLOYEE.LIST}?${params}`),
    select: (r: any) => r?.payload,
  });
};

// ── Education Records ────────────────────────────────────────────────────────
export const useGetEducation = (userId: string) =>
  useQuery({
    queryKey: ['education', userId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EDUCATION.LIST(userId)),
    select: (r: any) => r?.payload?.records || [],
    enabled: !!userId,
  });

export const useCreateEducation = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiRequest<any>(API_ENDPOINTS.EDUCATION.CREATE(userId), { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['education', userId] }),
  });
};

export const useDeleteEducation = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<any>(API_ENDPOINTS.EDUCATION.DELETE(userId, id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['education', userId] }),
  });
};

// ── Employment History ───────────────────────────────────────────────────────
export const useGetEmploymentHistory = (userId: string) =>
  useQuery({
    queryKey: ['employment-history', userId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EMPLOYMENT_HISTORY.LIST(userId)),
    select: (r: any) => r?.payload?.records || [],
    enabled: !!userId,
  });

export const useCreateEmploymentHistory = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiRequest<any>(API_ENDPOINTS.EMPLOYMENT_HISTORY.CREATE(userId), { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employment-history', userId] }),
  });
};

export const useDeleteEmploymentHistory = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<any>(API_ENDPOINTS.EMPLOYMENT_HISTORY.DELETE(userId, id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employment-history', userId] }),
  });
};

// ── Increment ────────────────────────────────────────────────────────────────
export const useGetIncrementHistory = (userId: string) =>
  useQuery({
    queryKey: ['increment-history', userId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.INCREMENT.HISTORY(userId)),
    select: (r: any) => r?.payload,
    enabled: !!userId,
  });

export const useCalculateIncrement = (userId: string, year: number, enabled = true) =>
  useQuery({
    queryKey: ['increment-calculate', userId, year],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.INCREMENT.CALCULATE(userId)}?year=${year}`),
    select: (r: any) => r?.payload,
    enabled: !!userId && !!year && enabled,
  });

export const useCreateIncrement = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiRequest<any>(API_ENDPOINTS.INCREMENT.CREATE(userId), { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['increment-history', userId] }),
  });
};

export const useUpdateIncrement = (userId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest<any>(API_ENDPOINTS.INCREMENT.UPDATE(userId, id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['increment-history', userId] }),
  });
};

// ── Overtime ─────────────────────────────────────────────────────────────────
export const useGetOvertimeList = (filters: Record<string, any> = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
  return useQuery({
    queryKey: ['overtime', filters],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.OVERTIME.LIST}?${params}`),
    select: (r: any) => r?.payload,
  });
};

export const useGetOvertimeStats = (filters: Record<string, any> = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.append(k, String(v)); });
  return useQuery({
    queryKey: ['overtime-stats', filters],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.OVERTIME.STATS}?${params}`),
    select: (r: any) => r?.payload,
  });
};

export const useSubmitOvertime = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiRequest<any>(API_ENDPOINTS.OVERTIME.SUBMIT, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['overtime'] });
      qc.invalidateQueries({ queryKey: ['overtime-stats'] });
    },
  });
};

export const useApproveOvertime = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      apiRequest<any>(API_ENDPOINTS.OVERTIME.APPROVE(id), { method: 'POST', body: JSON.stringify({ comment }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['overtime'] });
      qc.invalidateQueries({ queryKey: ['overtime-stats'] });
    },
  });
};

export const useRejectOvertime = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      apiRequest<any>(API_ENDPOINTS.OVERTIME.REJECT(id), { method: 'POST', body: JSON.stringify({ comment }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['overtime'] });
      qc.invalidateQueries({ queryKey: ['overtime-stats'] });
    },
  });
};

export const useCancelOvertime = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<any>(API_ENDPOINTS.OVERTIME.CANCEL(id), { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime'] }),
  });
};

// ── HR Reports ────────────────────────────────────────────────────────────────
export const useGetAnnualReport = (userId: string, year: number) =>
  useQuery({
    queryKey: ['hr-report-annual', userId, year],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.HR_REPORT.ANNUAL(userId)}?year=${year}`),
    select: (r: any) => r?.payload,
    enabled: !!userId && !!year,
  });

export const useGetMonthlyReport = (userId: string, year: number, month: number) =>
  useQuery({
    queryKey: ['hr-report-monthly', userId, year, month],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.HR_REPORT.MONTHLY(userId)}?year=${year}&month=${month}`),
    select: (r: any) => r?.payload,
    enabled: !!userId && !!year && !!month,
  });

export const useGetAggregateReport = (year: number, month: number) =>
  useQuery({
    queryKey: ['hr-report-aggregate', year, month],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.HR_REPORT.AGGREGATE}?year=${year}&month=${month}`),
    select: (r: any) => r?.payload,
    enabled: !!year && !!month,
  });
