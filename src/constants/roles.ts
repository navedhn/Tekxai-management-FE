/**
 * Role names must match the API `role_name` values exactly.
 */
export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  HR: 'HR',
  MARKETING: 'MARKETING',
  EMPLOYEE: 'EMPLOYEE',
  /** Legacy typo variant — kept for backward compat */
  EMPLLOYEE: 'EMPLLOYEE',
  // DIVISION_MANAGER and TEAM_LEAD are first-class backend roles (see
  // be-work/src/modules/permissions/constants/permission-keys.js
  // ALL_ROLE_NAMES + DEFAULT_ROLE_PERMISSIONS) with their own permission
  // sets, but were never added here — any user assigned one of these roles
  // was denied by every ProtectedRoute in the app and fell through
  // getRoleHomePath() straight to /login. Production readiness audit finding H4.
  DIVISION_MANAGER: 'DIVISION_MANAGER',
  TEAM_LEAD: 'TEAM_LEAD',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/** Roles that can access the ERP/Admin workspace */
export const ADMIN_ROLES: UserRole[] = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
  USER_ROLES.HR,
  USER_ROLES.MARKETING,
  USER_ROLES.DIVISION_MANAGER,
  USER_ROLES.TEAM_LEAD,
];

export const isUserRole = (value: string | null | undefined): value is UserRole =>
  Object.values(USER_ROLES).includes(value as UserRole);

/** Default landing route after login or when access is denied for a role. */
export const getRoleHomePath = (role: string | null | undefined): string => {
  if (role === USER_ROLES.SUPER_ADMIN) return '/admin';
  if (role === USER_ROLES.ADMIN) return '/admin';
  if (role === USER_ROLES.HR) return '/admin';
  if (role === USER_ROLES.MARKETING) return '/crm';
  if (role === USER_ROLES.DIVISION_MANAGER || role === USER_ROLES.TEAM_LEAD) return '/admin';
  if (role === USER_ROLES.EMPLOYEE || role === USER_ROLES.EMPLLOYEE) return '/employee';
  return '/login';
};
