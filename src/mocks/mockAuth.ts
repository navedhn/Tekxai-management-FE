import { USER_ROLES } from '@/constants/roles';
import type { User } from '@/types';

export const MOCK_SESSION_KEY = 'tekxai_mock_session';

export type MockAccount = {
  email: string;
  password: string;
  label: string;
  homePath: string;
  user: User;
};

const baseUser = (overrides: Partial<NonNullable<User>>): User => ({
  id: 'mock-user',
  first_name: 'Demo',
  last_name: 'User',
  email: 'demo@tekxai.com',
  role_id: '1',
  status: 'active',
  show_notifications: true,
  language: 'en',
  avatar: null,
  phone: null,
  department: null,
  position: null,
  designation: null,
  role_name: USER_ROLES.EMPLLOYEE,
  ...overrides,
});

/** Demo accounts — no backend required when mock auth is enabled. */
export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    email: 'admin@tekxai.com',
    password: 'admin123',
    label: 'Admin Dashboard',
    homePath: '/admin',
    user: baseUser({
      id: 'mock-admin-1',
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@tekxai.com',
      role_name: USER_ROLES.ADMIN,
      department: 'Operations',
      position: 'Administrator',
    }),
  },
  {
    email: 'employee@tekxai.com',
    password: 'employee123',
    label: 'Employee Dashboard',
    homePath: '/employee',
    user: baseUser({
      id: 'mock-employee-1',
      first_name: 'Employee',
      last_name: 'User',
      email: 'employee@tekxai.com',
      role_name: USER_ROLES.EMPLLOYEE,
      department: 'Engineering',
      position: 'Software Engineer',
    }),
  },
  {
    email: 'marketing@tekxai.com',
    password: 'marketing123',
    label: 'Marketing Portal',
    homePath: '/marketing',
    user: baseUser({
      id: 'mock-marketing-1',
      first_name: 'Marketing',
      last_name: 'Lead',
      email: 'marketing@tekxai.com',
      role_name: USER_ROLES.ADMIN,
      department: 'Marketing',
      position: 'Sales Manager',
    }),
  },
];

export const isMockAuthEnabled = (): boolean => {
  const flag = import.meta.env.VITE_USE_MOCK_AUTH;
  if (flag === 'false') return false;
  if (flag === 'true') return true;
  return import.meta.env.DEV;
};

export const isMockSession = (): boolean =>
  localStorage.getItem(MOCK_SESSION_KEY) === '1';

export const setMockSession = (active: boolean): void => {
  if (active) localStorage.setItem(MOCK_SESSION_KEY, '1');
  else localStorage.removeItem(MOCK_SESSION_KEY);
};

/** JWT-shaped token with a far-future expiry for local dev. */
export const createMockJwt = (subject: string): string => {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: subject,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    })
  );
  return `${header}.${payload}.mock-signature`;
};

export type MockLoginResponse = {
  payload: {
    accessToken: string;
    refreshToken: string;
    user: User;
    homePath: string;
  };
};

export const mockLogin = (email: string, password: string): MockLoginResponse => {
  const account = MOCK_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password
  );

  if (!account) {
    throw {
      status: 401,
      message: 'Invalid email or password',
      data: { message: 'Invalid email or password. Use demo credentials shown below.' },
    };
  }

  setMockSession(true);

  return {
    payload: {
      accessToken: createMockJwt(account.user!.id),
      refreshToken: createMockJwt(`${account.user!.id}-refresh`),
      user: account.user,
      homePath: account.homePath,
    },
  };
};

export const getMockAccountByEmail = (email: string): MockAccount | undefined =>
  MOCK_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
