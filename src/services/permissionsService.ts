import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { QUERY_KEYS } from '@/services/api/tanstackKeys';

const BASE = 'api/v1/permission';

export type PermissionScope = 'ALL' | 'BUSINESS_UNIT' | 'DEPARTMENT' | 'REGION' | 'BRANCH' | 'TEAM' | 'ASSIGNED' | 'OWN';

export interface PermissionDef {
  permission: string;
  label: string;
  workspace: string;
  module: string;
  action: string;
  granted?: boolean;
  scope?: PermissionScope;

  inherited?: boolean;

  source?: 'role' | 'role_direct' | 'role_inherited' | 'override_grant' | 'override_deny' | 'default_deny';
}

export interface PermissionsMatrix {
  roles: string[];
  definitions: PermissionDef[];
  by_role: Record<string, Record<string, boolean>>;

  by_role_scope?: Record<string, Record<string, PermissionScope>>;
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

export const fetchMyPermissions = async (): Promise<MyPermissions> => {
  const res = await apiRequest<any>(API_ENDPOINTS.PERMISSION.MY);
  return res?.payload || { roles: [], permissions: [], is_super_admin: false };
};

export function resolveHomePath(perms: MyPermissions | undefined | null): string | null {
  if (!perms) return null;
  if (perms.is_super_admin) return '/admin';
  if (perms.permissions?.includes('erp.workspace.access')) return '/admin';
  if (perms.permissions?.includes('erp.employee_workspace.access')) return '/employee';
  return null;
}

export function useMyPermissions() {
  const { isLoggedIn } = useAuthStore();
  return useQuery<MyPermissions>({
    queryKey: ['permissions', 'me'],
    queryFn: fetchMyPermissions,
    enabled: isLoggedIn,

    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

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

export interface GrantEntry { permission: string; granted: boolean; scope?: PermissionScope }

const saveRolePermissions = async ({ roleName, grants }: { roleName: string; grants: GrantEntry[] }) => {
  return apiRequest<any>(API_ENDPOINTS.PERMISSION.ROLE(roleName), {
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
    mutationFn: ({ userId, permission, granted, note, scope }: { userId: string; permission: string; granted: boolean; note?: string; scope?: PermissionScope }) =>
      apiRequest<any>(API_ENDPOINTS.PERMISSION.SET_USER_OVERRIDE(userId), {
        method: 'PUT',
        body: JSON.stringify({ permission, granted, note, scope }),
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

export interface PermissionAuditLogEntry {
  id: string;
  actor_id: string;
  target_type: 'ROLE' | 'USER';
  target_ref: string;
  permission: string;
  old_granted: boolean | null;
  new_granted: boolean | null;
  old_scope: string | null;
  new_scope: string | null;
  reason: string | null;
  created_at: string;
}

export interface PermissionAuditLogPage {
  rows: PermissionAuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogFilters {
  target_type?: 'ROLE' | 'USER';
  target_ref?: string;
  permission?: string;
  page?: number;
  limit?: number;
}

export function usePermissionAuditLog(filters: AuditLogFilters = {}) {
  return useQuery<PermissionAuditLogPage>({
    queryKey: ['permissions', 'audit-log', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.set(k, String(v)); });
      const qs = params.toString();
      const res = await apiRequest<any>(`${API_ENDPOINTS.PERMISSION.AUDIT_LOG}${qs ? `?${qs}` : ''}`);
      return res?.payload;
    },
    staleTime: 30_000,
  });
}

export type ApprovalRuleKey = 'EXPENSE_APPROVAL' | 'PURCHASE_APPROVAL' | 'DISCOUNT_APPROVAL' | 'LEAVE_APPROVAL' | 'SALARY_APPROVAL' | 'OVERTIME_APPROVAL';

export interface ApprovalRule {
  id: string;
  rule_key: ApprovalRuleKey;
  role_name: string | null;
  user_id: string | null;
  max_amount: string | null;
  currency: string | null;
  scope: PermissionScope;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useApprovalRules(filters: { rule_key?: string; role_name?: string; user_id?: string } = {}) {
  return useQuery<ApprovalRule[]>({
    queryKey: ['permissions', 'approval-rules', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const qs = params.toString();
      const res = await apiRequest<any>(`${API_ENDPOINTS.PERMISSION.APPROVAL_RULES}${qs ? `?${qs}` : ''}`);
      return res?.payload || [];
    },
    staleTime: 30_000,
  });
}

export function useCreateApprovalRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ApprovalRule>) =>
      apiRequest<any>(API_ENDPOINTS.PERMISSION.APPROVAL_RULES, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions', 'approval-rules'] }),
  });
}

export function useUpdateApprovalRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ApprovalRule> & { id: string }) =>
      apiRequest<any>(API_ENDPOINTS.PERMISSION.APPROVAL_RULE(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions', 'approval-rules'] }),
  });
}

export function useDeleteApprovalRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<any>(API_ENDPOINTS.PERMISSION.APPROVAL_RULE(id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions', 'approval-rules'] }),
  });
}

export interface RoleEntity {
  id: string;
  name: string;
  level: number;
  is_system: boolean;
  parent_role_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useRoleEntities() {
  return useQuery<RoleEntity[]>({
    queryKey: ['permissions', 'roles'],
    queryFn: async () => (await apiRequest<any>(API_ENDPOINTS.PERMISSION.ROLES))?.payload || [],
    staleTime: 30_000,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; level?: number; parent_role_id?: string; copy_from_role?: string; apply_template_id?: string }) =>
      apiRequest<any>(API_ENDPOINTS.PERMISSION.ROLES, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions', 'roles'] });
      qc.invalidateQueries({ queryKey: ['permissions', 'matrix'] });

      qc.invalidateQueries({ queryKey: QUERY_KEYS.ROLE.LIST });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<any>(API_ENDPOINTS.PERMISSION.ROLE_ENTITY(id), { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions', 'roles'] });
      qc.invalidateQueries({ queryKey: ['permissions', 'matrix'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ROLE.LIST });
    },
  });
}

export interface PermissionTemplateItem { id: string; template_id: string; permission: string; granted: boolean; scope: PermissionScope }
export interface PermissionTemplate {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: PermissionTemplateItem[];
  _count?: { items: number };
}

export function useTemplates() {
  return useQuery<PermissionTemplate[]>({
    queryKey: ['permissions', 'templates'],
    queryFn: async () => (await apiRequest<any>(API_ENDPOINTS.PERMISSION.TEMPLATES))?.payload || [],
    staleTime: 30_000,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; items?: GrantEntry[]; copy_from_role?: string }) =>
      apiRequest<any>(API_ENDPOINTS.PERMISSION.TEMPLATES, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions', 'templates'] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<any>(API_ENDPOINTS.PERMISSION.TEMPLATE(id), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions', 'templates'] }),
  });
}

export function useApplyTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, roleName }: { templateId: string; roleName: string }) =>
      apiRequest<any>(API_ENDPOINTS.PERMISSION.TEMPLATE_APPLY(templateId), { method: 'POST', body: JSON.stringify({ role_name: roleName }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions', 'matrix'] });
      qc.invalidateQueries({ queryKey: ['permissions', 'role'] });
    },
  });
}

export interface CatalogEntry {
  id: string;
  permission: string;
  label: string;
  workspace: string;
  module: string;
  action: string;
  category: string | null;
  is_deprecated: boolean;
  is_system: boolean;
}

export function usePermissionsCatalog(filters: { workspace?: string; module?: string; is_deprecated?: boolean } = {}) {
  return useQuery<CatalogEntry[]>({
    queryKey: ['permissions', 'catalog', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params.set(k, String(v)); });
      const qs = params.toString();
      const res = await apiRequest<any>(`${API_ENDPOINTS.PERMISSION.CATALOG}${qs ? `?${qs}` : ''}`);
      return res?.payload || [];
    },
    staleTime: 30_000,
  });
}

export function useUpdateCatalogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CatalogEntry> & { id: string }) =>
      apiRequest<any>(API_ENDPOINTS.PERMISSION.CATALOG_ENTRY(id), { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions', 'catalog'] }),
  });
}
