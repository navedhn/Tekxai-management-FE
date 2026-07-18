import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

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
  // Filter out undefined, null, and empty strings
  const filteredParams = params 
    ? Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== ''))
    : {};
    
  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString ? `${API_ENDPOINTS.USER.LIST}?${queryString}` : API_ENDPOINTS.USER.LIST;
  const res = await apiRequest<any>(url);
  const data = res?.payload?.records || res?.payload || res;
  return Array.isArray(data) ? data : [];
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

// Employee headcount/roster changes ripple into the HR Dashboard's own ad hoc
// keys (hr-dashboard/index.tsx) and employeeService's dashboard-stat key —
// neither is derived from QUERY_KEYS.USER.LIST, so they must be invalidated
// explicitly alongside the user list itself.
const invalidateUserAndDependents = (queryClient: ReturnType<typeof useQueryClient>, userId?: string) => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER.LIST });
  queryClient.invalidateQueries({ queryKey: ['employee-list-hr-dash'] });
  queryClient.invalidateQueries({ queryKey: ['employee-stats-hr-dash'] });
  queryClient.invalidateQueries({ queryKey: ['employee-directory'] });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEE.DASHBOARD_STATS });
  // 'user-list-brief' backs the Reporting Manager / Team Member pickers in
  // Add Employee, Employee Profile, TeamFormModal, TeamMembersModal, and
  // several other admin pages — previously never invalidated by any user
  // mutation, so those pickers could show stale names/statuses indefinitely.
  queryClient.invalidateQueries({ queryKey: ['user-list-brief'] });
  // Employee Profile reads ['employee-full', userId] / ['hr-profile', userId]
  // (hrService.ts) — previously only hrService's own mutations invalidated
  // these, so editing a user via ERP Users -> Edit User left an already-open
  // Employee Profile tab stale. Invalidate by userId when known, otherwise
  // fall back to the whole key prefix (matches every cached profile).
  queryClient.invalidateQueries({ queryKey: userId ? ['employee-full', userId] : ['employee-full'] });
  queryClient.invalidateQueries({ queryKey: userId ? ['hr-profile', userId] : ['hr-profile'] });
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

// Dedicated RBAC action — the only mutation allowed to change a user's role.
// Deliberately separate from useUpdateUserMutation (generic profile PUT),
// which the backend now strips role_id from unconditionally.
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

export const useDeleteUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => apiRequest(API_ENDPOINTS.USER.DELETE(id), { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      invalidateUserAndDependents(queryClient, String(id));
    },
  });
};

// useBulkUpdateUsersMutation was removed (RBAC security sprint): it posted to
// PUT /user, a route the backend never implemented, sending an arbitrary
// client-controlled payload including role_id with none of update_user()'s
// role-field stripping. It had zero call sites — dead code left as a landmine
// for whoever eventually added that backend route.

export const useBulkDeleteUsersMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiRequest(API_ENDPOINTS.USER.BULK_DELETE, { method: 'POST', body: JSON.stringify({ ids }) }),
    onSuccess: () => {
      invalidateUserAndDependents(queryClient);
    },
  });
};
