import { describe, expect, it } from 'vitest';
import { USER_ROLES, isUserRole, getRoleHomePath } from './roles';

describe('roles', () => {
  it('exposes backend role names', () => {
    expect(USER_ROLES.ADMIN).toBe('ADMIN');
    expect(USER_ROLES.EMPLLOYEE).toBe('EMPLLOYEE');
  });

  it('validates known roles', () => {
    expect(isUserRole('ADMIN')).toBe(true);
    // Both spellings are valid — EMPLLOYEE is a legacy typo variant kept
    // in USER_ROLES for backward compat, not something isUserRole rejects.
    expect(isUserRole('EMPLLOYEE')).toBe(true);
    expect(isUserRole('EMPLOYEE')).toBe(true);
    expect(isUserRole('NOT_A_ROLE')).toBe(false);
    expect(isUserRole(null)).toBe(false);
  });

  it('maps roles to home paths', () => {
    expect(getRoleHomePath(USER_ROLES.ADMIN)).toBe('/admin');
    expect(getRoleHomePath(USER_ROLES.EMPLLOYEE)).toBe('/employee');
    expect(getRoleHomePath(null)).toBe('/login');
  });
});
