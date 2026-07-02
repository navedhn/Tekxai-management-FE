import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

// --- Types ---

export interface Policy {
  id: string;
  name: string;
  description?: string;
}

export interface TimesheetEntry {
  entry_id: string | null;
  day_date: string;
  day_label: string;
  has_entry: boolean;
  check_in: string | null;
  check_out: string | null;
  duration_seconds: number;
  duration_label: string;
  status: string | null;
  status_label: string | null;
  no_entry_text: string;
  // added for admin side employee names
  employee?: string;
}

export interface RecentActivityEvent {
  id: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  employee: string;
  user_id: string;
  at: string;
  message: string;
}

export interface WeeklyTimesheetData {
  week_start: string;
  week_end: string;
  week_label: string;
  total_duration_seconds: number;
  total_duration_label: string;
  rows: TimesheetEntry[];
}

export interface EditRequest {
  id: string;
  name: string;
  status: string;
  time: string;
  reason: string;
  status_label?: string;
  date_range_label?: string;
}

export interface TimeOffRequest {
  id: string;
  name?: string;
  email?: string;
  type?: string;
  dateRange?: string;
  duration?: string;
  reason?: string;
  avatar?: string;
  status?: string;

  // New accurate fields:
  policy_name?: string;
  status_label?: string;
  date_range_label?: string;
  total_hours_label?: string;
  submitted_at_label?: string;
  manager_comment?: string;
  days?: number;
}

export interface MyRequestsData {
  time_off_requests: TimeOffRequest[];
  timesheet_edit_requests: EditRequest[];
  counts: {
    time_off_requests: number;
    timesheet_edit_requests: number;
  };
}

// --- API Functions ---

const getWeeklyTimesheetApi = async (params?: Record<string, any>) => {
  const filteredParams = params 
    ? Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== ''))
    : {};
  
  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString ? `${API_ENDPOINTS.TIMESHEET.WEEKLY}?${queryString}` : API_ENDPOINTS.TIMESHEET.WEEKLY;
  const res = await apiRequest<any>(url);
  const payload = res?.payload || res;
  return payload as WeeklyTimesheetData;
};

const getRecentActivityApi = async () => {
  const res = await apiRequest<any>(API_ENDPOINTS.TIMESHEET.RECENT_ACTIVITY);
  const data = res?.payload || res;
  return (Array.isArray(data) ? data : []) as RecentActivityEvent[];
};

export const useGetRecentActivityFeed = (enabled = true) => {
  return useQuery<RecentActivityEvent[]>({
    queryKey: QUERY_KEYS.TIMESHEET.RECENT_ACTIVITY,
    queryFn: getRecentActivityApi,
    enabled,
    staleTime: 30000,
  });
};

const getTimesheetRequestsApi = async () => {
  const res = await apiRequest<any>(API_ENDPOINTS.TIMESHEET.REQUESTS);
  const data = res?.payload || res;
  return data as MyRequestsData;
};

const getTimeOffRequestsApi = async () => {
  const res = await apiRequest<any>(API_ENDPOINTS.TIMESHEET.MY_REQUESTS);
  const data = res?.payload || res;
  return data as MyRequestsData;
};

const updateTimesheetEntryApi = async ({ id, data }: { id: string | number; data: any }) => {
  return apiRequest(API_ENDPOINTS.TIMESHEET.UPDATE(id), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

const deleteTimesheetEntryApi = async (id: string | number) => {
  return apiRequest(API_ENDPOINTS.TIMESHEET.DELETE(id), {
    method: 'DELETE',
  });
};

const getTimeOffPoliciesApi = async () => {
  const res = await apiRequest<any>(API_ENDPOINTS.TIMESHEET.POLICIES);
  const data = res?.payload?.records || res?.payload || res;
  return (Array.isArray(data) ? data : []) as Policy[];
};

const createTimeOffRequestApi = async (data: Record<string, any>) => {
  return apiRequest(API_ENDPOINTS.TIMESHEET.REQUEST_TIME_OFF, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

const createTimesheetEntryApi = async (data: any) => {
  return apiRequest(API_ENDPOINTS.TIMESHEET.CREATE_ENTRY, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

const approveEditRequestApi = async (id: string | number) => {
   return apiRequest(`api/v1/timesheet/edit-request/${id}/approve`, { method: 'POST' });
};

const rejectEditRequestApi = async (id: string | number) => {
   return apiRequest(`api/v1/timesheet/edit-request/${id}/reject`, { method: 'POST' });
};

const approveTimeOffApi = async (id: string | number) => {
   return apiRequest(`api/v1/timesheet/time-off/${id}/approve`, { method: 'POST' });
};

const rejectTimeOffApi = async (id: string | number) => {
   return apiRequest(`api/v1/timesheet/time-off/${id}/reject`, { method: 'POST' });
};

// --- Hooks ---

export const useApproveEditRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveEditRequestApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TIMESHEET.REQUESTS });
    },
  });
};

export const useRejectEditRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectEditRequestApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TIMESHEET.REQUESTS });
    },
  });
};

export const useGetWeeklyTimesheet = (params?: Record<string, any>, enabled = true) => {
  return useQuery<WeeklyTimesheetData>({
    queryKey: [...QUERY_KEYS.TIMESHEET.WEEKLY, params],
    queryFn: () => getWeeklyTimesheetApi(params),
    enabled
  });
};

export const useGetTimesheetRequests = (enabled = true) => {
  return useQuery<MyRequestsData>({
    queryKey: QUERY_KEYS.TIMESHEET.REQUESTS,
    queryFn: getTimesheetRequestsApi,
    enabled
  });
};

export const useGetTimeOffRequests = (enabled = true) => {
  return useQuery<MyRequestsData>({
    queryKey: QUERY_KEYS.TIMESHEET.MY_REQUESTS,
    queryFn: getTimeOffRequestsApi,
    enabled
  });
};

export const useUpdateTimesheetMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTimesheetEntryApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TIMESHEET.WEEKLY });
    },
  });
};

export const useDeleteTimesheetMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTimesheetEntryApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TIMESHEET.WEEKLY });
    },
  });
};

export const useApproveTimeOffMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveTimeOffApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TIMESHEET.MY_REQUESTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TIMESHEET.REQUESTS });
    },
  });
};

export const useRejectTimeOffMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectTimeOffApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TIMESHEET.MY_REQUESTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TIMESHEET.REQUESTS });
    },
  });
};

export const useGetTimeOffPolicies = (enabled = true) => {
  return useQuery<Policy[]>({
    queryKey: ['timeOffPolicies'],
    queryFn: getTimeOffPoliciesApi,
    enabled
  });
};

export const useCreateTimeOffRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTimeOffRequestApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TIMESHEET.MY_REQUESTS });
    },
  });
};

export const useCreateTimesheetEntryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTimesheetEntryApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TIMESHEET.WEEKLY });
    },
  });
};

