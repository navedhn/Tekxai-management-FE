import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from './ProtectedRoute';
import { useAuthStore } from '@/stores/authStore';
import type { MyPermissions } from '@/services/permissionsService';

const ProtectedContent = () => <div>Protected Content</div>;

const withQueryClient = (node: React.ReactNode, myPerms?: MyPermissions) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (myPerms) {
    queryClient.setQueryData(['permissions', 'me'], myPerms);
  }
  return <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>;
};

const renderProtectedRoute = (
  props: { permission?: string | string[]; superAdminOnly?: boolean; noPermissionRedirect?: string },
  myPerms?: MyPermissions,
) =>
  render(
    withQueryClient(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/403" element={<div>Access Denied Page</div>} />
          <Route path="/employee" element={<div>Employee Home Page</div>} />
          <Route element={<ProtectedRoute {...props} />}>
            <Route path="/private" element={<ProtectedContent />} />
          </Route>
        </Routes>
      </MemoryRouter>,
      myPerms,
    )
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ isLoggedIn: false, user: null, role: null });
  });

  it('redirects unauthenticated users to login regardless of permission', () => {
    renderProtectedRoute({ permission: 'erp.workspace.access' });
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders outlet when the live permission is granted', () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'EMPLOYEE', user: { id: '1' } as never });
    renderProtectedRoute(
      { permission: 'erp.workspace.access' },
      { roles: ['EMPLOYEE'], permissions: ['erp.workspace.access'], is_super_admin: false },
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /403 when the live permission is absent, without logging out', () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'EMPLOYEE', user: { id: '2' } as never });
    renderProtectedRoute(
      { permission: 'erp.workspace.access' },
      { roles: ['EMPLOYEE'], permissions: [], is_super_admin: false },
    );
    expect(screen.getByText('Access Denied Page')).toBeInTheDocument();
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
  });

  it('denies access even when a fictional/unknown role name is present, if the permission is absent', () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'SOME_FICTIONAL_ADMIN_SOUNDING_ROLE', user: { id: '3' } as never });
    renderProtectedRoute(
      { permission: 'erp.workspace.access' },
      { roles: ['SOME_FICTIONAL_ADMIN_SOUNDING_ROLE'], permissions: [], is_super_admin: false },
    );
    expect(screen.getByText('Access Denied Page')).toBeInTheDocument();
  });

  it('grants access to any permission when is_super_admin is true', () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'SUPER_ADMIN', user: { id: '4' } as never });
    renderProtectedRoute(
      { permission: 'erp.some.arbitrary.permission' },
      { roles: ['SUPER_ADMIN'], permissions: [], is_super_admin: true },
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('superAdminOnly denies a caller with is_super_admin false, even with every permission granted', () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'ADMIN', user: { id: '5' } as never });
    renderProtectedRoute(
      { superAdminOnly: true },
      { roles: ['ADMIN'], permissions: ['erp.workspace.access', 'erp.settings.manage'], is_super_admin: false },
    );
    expect(screen.getByText('Access Denied Page')).toBeInTheDocument();
  });

  it('superAdminOnly grants a caller with is_super_admin true', () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'SUPER_ADMIN', user: { id: '6' } as never });
    renderProtectedRoute({ superAdminOnly: true }, { roles: ['SUPER_ADMIN'], permissions: [], is_super_admin: true });
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('with neither permission nor superAdminOnly, admits any authenticated user', () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'EMPLOYEE', user: { id: '7' } as never });
    renderProtectedRoute({}, { roles: ['EMPLOYEE'], permissions: [], is_super_admin: false });
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('an array permission grants access when the caller holds only one of the listed keys', () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'HR_MANAGER', user: { id: '8' } as never });
    renderProtectedRoute(
      { permission: ['erp.users.create', 'hr.employees.edit'] },
      { roles: ['HR_MANAGER'], permissions: ['hr.employees.edit'], is_super_admin: false },
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('an array permission denies access when the caller holds none of the listed keys', () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'EMPLOYEE', user: { id: '9' } as never });
    renderProtectedRoute(
      { permission: ['erp.users.create', 'hr.employees.edit'] },
      { roles: ['EMPLOYEE'], permissions: [], is_super_admin: false },
    );
    expect(screen.getByText('Access Denied Page')).toBeInTheDocument();
  });

  it('redirects to a custom noPermissionRedirect target instead of /403 when given one, on missing permission', () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'ENGINEER', user: { id: '11' } as never });
    renderProtectedRoute(
      { permission: 'erp.dashboard.view', noPermissionRedirect: '/employee' },
      { roles: ['ENGINEER'], permissions: ['erp.workspace.access'], is_super_admin: false },
    );
    expect(screen.getByText('Employee Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied Page')).not.toBeInTheDocument();
  });

  it('with noPermissionRedirect set but the permission actually granted, still renders the outlet (redirect never fires)', () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'ADMIN', user: { id: '12' } as never });
    renderProtectedRoute(
      { permission: 'erp.dashboard.view', noPermissionRedirect: '/employee' },
      { roles: ['ADMIN'], permissions: ['erp.dashboard.view'], is_super_admin: false },
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('falls back to /403 when noPermissionRedirect is not given (unchanged default behavior)', () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'ENGINEER', user: { id: '13' } as never });
    renderProtectedRoute(
      { permission: 'erp.dashboard.view' },
      { roles: ['ENGINEER'], permissions: ['erp.workspace.access'], is_super_admin: false },
    );
    expect(screen.getByText('Access Denied Page')).toBeInTheDocument();
  });

  it('shows a page skeleton while live permissions are loading', () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'EMPLOYEE', user: { id: '10' } as never });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, queryFn: () => new Promise(() => {}) } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/employee']}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/403" element={<div>Access Denied Page</div>} />
            <Route element={<ProtectedRoute permission="erp.employee_workspace.access" />}>
              <Route path="/employee" element={<ProtectedContent />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Access Denied Page')).not.toBeInTheDocument();
  });
});
