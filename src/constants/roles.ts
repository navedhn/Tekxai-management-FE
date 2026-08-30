export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HR: 'HR',
  MARKETING: 'MARKETING',
  EMPLOYEE: 'EMPLOYEE',
  TEAM_LEAD: 'TEAM_LEAD',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const isUserRole = (value: string | null | undefined): value is UserRole =>
  Object.values(USER_ROLES).includes(value as UserRole);

export const getRoleHomePath = (role: string | null | undefined): string => {
  if (role === USER_ROLES.SUPER_ADMIN) return '/admin';
  if (role === USER_ROLES.HR) return '/admin';
  if (role === USER_ROLES.MARKETING) return '/employee';
  if (role === USER_ROLES.EMPLOYEE) return '/employee';
  return '/login';
};
