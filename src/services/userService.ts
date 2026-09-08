import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';
import { uploadEmployeeAvatar } from '@/lib/upload';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar?: string;
  role_id?: string;
  role_name?: string;
  role?: { id: string; name: string } | string;
  roles?: { name: string };
  department?: string;
  designation?: string;
  position?: string;
  phone?: string;
  status?: string;
  team_memberships?: any[];
}

const fetchUsersApi = async (params?: Record<string, any>) => {

  const filteredParams = params
    ? Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== ''))
    : {};

  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString ? `${API_ENDPOINTS.USER.LIST}?${queryString}` : API_ENDPOINTS.USER.LIST;
  const res = await apiRequest<any>(url);
  const data = res?.payload?.records || res?.payload || res;
  const records = Array.isArray(data) ? data : [];
  return [...records].sort((a, b) =>
    `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`),
  );
};

export const useFetchUsersQuery = (params?: Record<string, any>, enabled: boolean = true) => {
  return useQuery<User[]>({
    queryKey: [...QUERY_KEYS.USER.LIST, params],
    queryFn: () => fetchUsersApi(params),
    enabled,
  });
};

export const useGetUserDetailQuery = (id: string | undefined, enabled: boolean = true) => {
  return useQuery<User>({
    queryKey: [...QUERY_KEYS.USER.LIST, 'detail', id],
    queryFn: async () => {
      if (!id) throw new Error('User ID is required');
      const res = await apiRequest<any>(API_ENDPOINTS.USER.DETAIL(id));
      return res?.payload || res;
    },
    enabled: enabled && !!id,
  });
};

export const useLazyFetchUsersQuery = (params?: Record<string, any>) => {
  const query = useQuery<User[]>({
    queryKey: [...QUERY_KEYS.USER.LIST, params],
    queryFn: () => fetchUsersApi(params),
    enabled: false,
  });

  return {
    ...query,
    fetchUsers: (params?: Record<string, any>) => {
      return query.refetch();
    },
  };
};

const invalidateUserAndDependents = (queryClient: ReturnType<typeof useQueryClient>, userId?: string) => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER.LIST });
  queryClient.invalidateQueries({ queryKey: ['employee-list-hr-dash'] });
  queryClient.invalidateQueries({ queryKey: ['employee-stats-hr-dash'] });
  queryClient.invalidateQueries({ queryKey: ['employee-directory'] });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEE.DASHBOARD_STATS });

  queryClient.invalidateQueries({ queryKey: ['user-list-brief'] });

  queryClient.invalidateQueries({ queryKey: userId ? ['employee-full', userId] : ['employee-full'] });
  queryClient.invalidateQueries({ queryKey: userId ? ['hr-profile', userId] : ['hr-profile'] });

  // Offboarding page (/admin/offboarding) reads per-stage employee lists under
  // this key (['employees','lifecycle-stage',stage]); any mutation that can
  // move a user's lifecycle_stage must invalidate it so the stage lists
  // (e.g. Notice Period) refresh immediately instead of requiring a manual
  // page reload.
  queryClient.invalidateQueries({ queryKey: ['employees', 'lifecycle-stage'] });
};

export const useCreateUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest(API_ENDPOINTS.USER.CREATE, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      invalidateUserAndDependents(queryClient);
    },
  });
};

export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) =>
      apiRequest(API_ENDPOINTS.USER.UPDATE(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_data, variables) => {
      invalidateUserAndDependents(queryClient, String(variables.id));
    },
  });
};

export const useUpdateMyProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { first_name?: string; last_name?: string; phone?: string; designation?: string; position?: string; avatar?: string }) =>
      apiRequest<any>(API_ENDPOINTS.USER.ME_UPDATE, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      invalidateUserAndDependents(queryClient);
    },
  });
};

export const useUploadAvatarMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, file }: { userId: string; file: File }) => uploadEmployeeAvatar(userId, file),
    onSuccess: (_data, variables) => {
      invalidateUserAndDependents(queryClient, variables.userId);
    },
  });
};

export const useUpdateMyPublicKeyMutation = () => {
  return useMutation({
    mutationFn: (public_key: string) =>
      apiRequest<any>(API_ENDPOINTS.USER.MY_PUBLIC_KEY, { method: 'PUT', body: JSON.stringify({ public_key }) }),
  });
};

export const useGetUserPublicKeyQuery = (userId: string | null) =>
  useQuery<{ user_id: string; public_key: string } | null>({
    queryKey: ['user-public-key', userId],
    queryFn: async () => {
      const r = await apiRequest<any>(API_ENDPOINTS.USER.PUBLIC_KEY(userId!));
      return r?.payload || null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

export const useChangeUserRoleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role_id }: { id: string | number; role_id: string }) =>
      apiRequest(API_ENDPOINTS.USER.ROLE_CHANGE(id), { method: 'PUT', body: JSON.stringify({ role_id }) }),
    onSuccess: (_data, variables) => {
      invalidateUserAndDependents(queryClient, String(variables.id));
    },
  });
};

export const useUpdateEmployeeIdMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employee_id }: { id: string | number; employee_id: string }) =>
      apiRequest(API_ENDPOINTS.USER.EMPLOYEE_ID_CHANGE(id), { method: 'PATCH', body: JSON.stringify({ employee_id }) }),
    onSuccess: (_data, variables) => {
      invalidateUserAndDependents(queryClient, String(variables.id));
    },
  });
};

export const useDeleteUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => apiRequest(API_ENDPOINTS.USER.DELETE(id), { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      invalidateUserAndDependents(queryClient, String(id));
    },
  });
};

export const useBulkDeleteUsersMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiRequest(API_ENDPOINTS.USER.BULK_DELETE, { method: 'POST', body: JSON.stringify({ ids }) }),
    onSuccess: () => {
      invalidateUserAndDependents(queryClient);
    },
  });
};

export const useSetLifecycleStageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ user_ids, lifecycle_stage }: { user_ids: string[]; lifecycle_stage: string }) =>
      apiRequest(API_ENDPOINTS.EMPLOYEE_LIFECYCLE.SET_STAGE, { method: 'POST', body: JSON.stringify({ user_ids, lifecycle_stage }) }),
    onSuccess: () => {
      invalidateUserAndDependents(queryClient);
    },
  });
};

export const useMoveToProbationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiRequest(API_ENDPOINTS.EMPLOYEE_LIFECYCLE.MOVE_TO_PROBATION(userId), { method: 'POST' }),
    onSuccess: (_data, userId) => invalidateUserAndDependents(queryClient, String(userId)),
  });
};

export const useEnterNoticePeriodMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, notice_period_days, exit_type, exit_reason, last_working_date }: { userId: string; notice_period_days?: number; exit_type?: 'RESIGNATION' | 'TERMINATION'; exit_reason?: string; last_working_date?: string }) =>
      apiRequest(API_ENDPOINTS.EMPLOYEE_LIFECYCLE.ENTER_NOTICE_PERIOD(userId), {
        method: 'POST',
        body: JSON.stringify({ ...(notice_period_days ? { notice_period_days } : {}), ...(exit_type ? { exit_type } : {}), ...(exit_reason ? { exit_reason } : {}), ...(last_working_date ? { last_working_date } : {}) }),
      }),
    onSuccess: (_data, variables) => invalidateUserAndDependents(queryClient, String(variables.userId)),
  });
};

export const useMoveToExitClearanceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiRequest(API_ENDPOINTS.EMPLOYEE_LIFECYCLE.MOVE_TO_EXIT_CLEARANCE(userId), { method: 'POST' }),
    onSuccess: (_data, userId) => invalidateUserAndDependents(queryClient, String(userId)),
  });
};

export const useArchiveEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiRequest(API_ENDPOINTS.EMPLOYEE_LIFECYCLE.ARCHIVE(userId), { method: 'POST' }),
    onSuccess: (_data, userId) => invalidateUserAndDependents(queryClient, String(userId)),
  });
};

export const useRequestConfirmEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      apiRequest(API_ENDPOINTS.EMPLOYEE_LIFECYCLE.REQUEST_CONFIRM_EMPLOYEE(userId), {
        method: 'POST',
        body: JSON.stringify(reason ? { reason } : {}),
      }),
    onSuccess: (_data, variables) => invalidateUserAndDependents(queryClient, String(variables.userId)),
  });
};

export const useRequestExtendProbationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason, new_probation_end }: { userId: string; reason?: string; new_probation_end: string }) =>
      apiRequest(API_ENDPOINTS.EMPLOYEE_LIFECYCLE.REQUEST_EXTEND_PROBATION(userId), {
        method: 'POST',
        body: JSON.stringify({ reason, new_probation_end }),
      }),
    onSuccess: (_data, variables) => invalidateUserAndDependents(queryClient, String(variables.userId)),
  });
};

export const useRequestTerminateProbationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason, last_working_date }: { userId: string; reason?: string; last_working_date?: string }) =>
      apiRequest(API_ENDPOINTS.EMPLOYEE_LIFECYCLE.REQUEST_TERMINATE_PROBATION(userId), {
        method: 'POST',
        body: JSON.stringify({ ...(reason ? { reason } : {}), ...(last_working_date ? { last_working_date } : {}) }),
      }),
    onSuccess: (_data, variables) => invalidateUserAndDependents(queryClient, String(variables.userId)),
  });
};

export const useRequestArchiveMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      apiRequest(API_ENDPOINTS.EMPLOYEE_LIFECYCLE.REQUEST_ARCHIVE(userId), {
        method: 'POST',
        body: JSON.stringify(reason ? { reason } : {}),
      }),
    onSuccess: (_data, variables) => invalidateUserAndDependents(queryClient, String(variables.userId)),
  });
};
