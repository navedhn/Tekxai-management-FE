import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from './ProtectedRoute';
import { useAuthStore } from '@/stores/authStore';
import { USER_ROLES } from '@/constants/roles';

const ProtectedContent = () => <div>Protected Content</div>;

// ProtectedRoute calls useMyPermissions() (a useQuery) unconditionally, even
// before the isLoggedIn check, so every render needs a QueryClientProvider.
const withQueryClient = (node: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>;
};

const renderProtectedRoute = (roles?: Array<(typeof USER_ROLES)[keyof typeof USER_ROLES]>) =>
  render(
    withQueryClient(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/employee" element={<div>Employee Dashboard</div>} />
          <Route path="/admin" element={<div>Admin Dashboard</div>} />
          <Route element={<ProtectedRoute roles={roles} />}>
            <Route path="/private" element={<ProtectedContent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ isLoggedIn: false, user: null, role: null });
  });

  it('redirects unauthenticated users to login', () => {
    renderProtectedRoute([USER_ROLES.ADMIN]);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders outlet for authorized admin users', () => {
    useAuthStore.setState({
      isLoggedIn: true,
      role: USER_ROLES.ADMIN,
      user: { id: '1', role_name: USER_ROLES.ADMIN } as never,
    });

    renderProtectedRoute([USER_ROLES.ADMIN]);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects users with the wrong role to the 403 page without logging out', () => {
    useAuthStore.setState({
      isLoggedIn: true,
      role: USER_ROLES.EMPLLOYEE,
      user: { id: '2', role_name: USER_ROLES.EMPLLOYEE } as never,
    });

    render(
      withQueryClient(
        <MemoryRouter initialEntries={['/private']}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/403" element={<div>Access Denied Page</div>} />
            <Route element={<ProtectedRoute roles={[USER_ROLES.ADMIN]} />}>
              <Route path="/private" element={<ProtectedContent />} />
            </Route>
          </Routes>
        </MemoryRouter>
      )
    );

    expect(screen.getByText('Access Denied Page')).toBeInTheDocument();
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
  });
});
