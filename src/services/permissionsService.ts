import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { API_ENDPOINTS } from '@/services/api/endpoints';

const BASE = 'api/v1/permission';

export interface PermissionDef {
  permission: string;
  label: string;
  workspace: string;
  module: string;
  action: string;
  granted?: boolean;
  source?: 'role' | 'override_grant' | 'override_deny' | 'default_deny';
}

export interface PermissionsMatrix {
  roles: string[];
  definitions: PermissionDef[];
  by_role: Record<string, Record<string, boolean>>;
}

export interface MyPermissions {
  roles: string[];
  permissions: string[];
  is_super_admin: boolean;
}

export interface UserPermissionOverride {
  id: string;
  user_id: string;
  permission: string;
  granted: boolean;
  note?: string;
  granted_by?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPermissionsData {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
    roles: Array<{ role: { name: string } }>;
  };
  roles: string[];
  overrides: UserPermissionOverride[];
  effective: PermissionDef[];
}

// ── My permissions (logged-in user) ──────────────────────────────────────────

const fetchMyPermissions = async (): Promise<MyPermissions> => {
  const res = await apiRequest<any>(API_ENDPOINTS.PERMISSION.MY);
  return res?.payload || { roles: [], permissions: [], is_super_admin: false };
};

export function useMyPermissions() {
  const { isLoggedIn } = useAuthStore();
  return useQuery<MyPermissions>({
    queryKey: ['permissions', 'me'],
    queryFn: fetchMyPermissions,
    enabled: isLoggedIn,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ── Full matrix (Admin permissions page) ────────────────────────────────────

const fetchMatrix = async (): Promise<PermissionsMatrix> => {
  const res = await apiRequest<any>(API_ENDPOINTS.PERMISSION.MATRIX);
  return res?.payload;
};

export function usePermissionsMatrix() {
  return useQuery<PermissionsMatrix>({
    queryKey: ['permissions', 'matrix'],
    queryFn: fetchMatrix,
    staleTime: 60_000,
  });
}

// ── Single role ───────────────────────────────────────────────────────────────

const fetchRolePermissions = async (roleName: string) => {
  const res = await apiRequest<any>(API_ENDPOINTS.PERMISSION.ROLE(roleName));
  return res?.payload as { role_name: string; permissions: PermissionDef[] };
};

export function useRolePermissions(roleName: string) {
  return useQuery({
    queryKey: ['permissions', 'role', roleName],
    queryFn: () => fetchRolePermissions(roleName),
    enabled: !!roleName,
    staleTime: 60_000,
  });
}

// ── Save role permissions ─────────────────────────────────────────────────────

interface GrantEntry { permission: string; granted: boolean }

const saveRolePermissions = async ({ roleName, grants }: { roleName: string; grants: GrantEntry[] }) => {
  return apiRequest(API_ENDPOINTS.PERMISSION.ROLE(roleName), {
    method: 'PUT',
    body: JSON.stringify({ grants }),
  });
};

export function useSaveRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveRolePermissions,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['permissions', 'role', variables.roleName] });
      qc.invalidateQueries({ queryKey: ['permissions', 'matrix'] });
      qc.invalidateQueries({ queryKey: ['permissions', 'me'] });
    },
  });
}

// ── User override management ─────────────────────────────────────────────────

export function useUserPermissions(userId?: string) {
  return useQuery<UserPermissionsData>({
    queryKey: ['permissions', 'user', userId],
    queryFn: async () => {
      const res = await apiRequest<any>(API_ENDPOINTS.PERMISSION.USER_OVERRIDES(userId!));
      return res?.payload;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useSetUserPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, permission, granted, note }: { userId: string; permission: string; granted: boolean; note?: string }) =>
      apiRequest<any>(API_ENDPOINTS.PERMISSION.SET_USER_OVERRIDE(userId), {
        method: 'PUT',
        body: JSON.stringify({ permission, granted, note }),
      }),
    onSuccess: (_r, { userId }) => {
      qc.invalidateQueries({ queryKey: ['permissions', 'user', userId] });
      qc.invalidateQueries({ queryKey: ['permissions', 'me'] });
    },
  });
}

export function useDeleteUserPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, permission }: { userId: string; permission: string }) =>
      apiRequest<any>(API_ENDPOINTS.PERMISSION.DEL_USER_OVERRIDE(userId, permission), { method: 'DELETE' }),
    onSuccess: (_r, { userId }) => {
      qc.invalidateQueries({ queryKey: ['permissions', 'user', userId] });
      qc.invalidateQueries({ queryKey: ['permissions', 'me'] });
    },
  });
}

export function useClearUserPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiRequest<any>(API_ENDPOINTS.PERMISSION.DEL_ALL_OVERRIDES(userId), { method: 'DELETE' }),
    onSuccess: (_r, userId) => {
      qc.invalidateQueries({ queryKey: ['permissions', 'user', userId] });
      qc.invalidateQueries({ queryKey: ['permissions', 'me'] });
    },
  });
}
