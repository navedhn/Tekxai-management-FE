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
