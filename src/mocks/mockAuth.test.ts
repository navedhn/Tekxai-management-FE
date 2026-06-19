import { describe, expect, it } from 'vitest';
import { mockLogin, MOCK_ACCOUNTS } from './mockAuth';

describe('mockAuth', () => {
  it('logs in admin with demo credentials', () => {
    const res = mockLogin('admin@tekxai.com', 'admin123');
    expect(res.payload.user?.role_name).toBe('ADMIN');
    expect(res.payload.homePath).toBe('/admin');
    expect(res.payload.accessToken).toContain('.');
  });

  it('rejects invalid credentials', () => {
    expect(() => mockLogin('admin@tekxai.com', 'wrong')).toThrow();
  });

  it('exposes three demo dashboards', () => {
    expect(MOCK_ACCOUNTS).toHaveLength(3);
    expect(MOCK_ACCOUNTS.map((a) => a.homePath)).toEqual(['/admin', '/employee', '/marketing']);
  });
});
