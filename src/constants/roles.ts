/**
 * Role names must match the API `role_name` values exactly.
 * Note: backend uses "EMPLLOYEE" (three L's).
 */
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  EMPLLOYEE: 'EMPLLOYEE',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const isUserRole = (value: string | null | undefined): value is UserRole =>
  value === USER_ROLES.ADMIN || value === USER_ROLES.EMPLLOYEE;

/** Default landing route after login or when access is denied for a role. */
export const getRoleHomePath = (role: string | null | undefined): string => {
  if (role === USER_ROLES.ADMIN) return '/admin';
  if (role === USER_ROLES.EMPLLOYEE) return '/employee';
  return '/login';
};
