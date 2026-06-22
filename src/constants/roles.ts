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
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/** Roles that can access the ERP/Admin workspace */
export const ADMIN_ROLES: UserRole[] = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
  USER_ROLES.HR,
  USER_ROLES.MARKETING,
];

export const isUserRole = (value: string | null | undefined): value is UserRole =>
  Object.values(USER_ROLES).includes(value as UserRole);

/** Default landing route after login or when access is denied for a role. */
export const getRoleHomePath = (role: string | null | undefined): string => {
  if (role === USER_ROLES.SUPER_ADMIN) return '/admin';
  if (role === USER_ROLES.ADMIN) return '/admin';
  if (role === USER_ROLES.HR) return '/hr';
  if (role === USER_ROLES.MARKETING) return '/crm';
  if (role === USER_ROLES.EMPLOYEE || role === USER_ROLES.EMPLLOYEE) return '/employee';
  return '/login';
};
