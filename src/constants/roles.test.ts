import { describe, expect, it } from 'vitest';
import { USER_ROLES, isUserRole } from './roles';

describe('roles', () => {
  it('exposes backend role names', () => {
    expect(USER_ROLES.ADMIN).toBe('ADMIN');
    expect(USER_ROLES.EMPLLOYEE).toBe('EMPLLOYEE');
  });

  it('validates known roles', () => {
    expect(isUserRole('ADMIN')).toBe(true);
    expect(isUserRole('EMPLLOYEE')).toBe(true);
    expect(isUserRole('EMPLOYEE')).toBe(false);
    expect(isUserRole(null)).toBe(false);
  });
});
