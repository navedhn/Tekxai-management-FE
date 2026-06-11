import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/constants/roles';

/**
 * Silently logs the user out and redirects to /login.
 * Used when a logged-in user tries to access a route
 * they are not authorized for — no 403 page shown.
 */
const LogoutAndRedirect: React.FC = () => {
  const { userLogout } = useAuth();
  useEffect(() => {
    userLogout();
  }, [userLogout]);
  return <Navigate to="/login" replace />;
};

/**
 * Guards a route behind authentication and optional role checks.
 * - Not logged in  → /login
 * - Wrong role     → logout + /login  (no unauthorized page)
 * - Authorized     → renders children via <Outlet />
 */
const ProtectedRoute: React.FC<{ roles?: UserRole[] }> = ({ roles }) => {
  const { isLoggedIn, role } = useAuth();

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  const hasRequiredRole = !roles?.length || (role != null && roles.includes(role as UserRole));
  if (!hasRequiredRole) return <LogoutAndRedirect />;

  return <Outlet />;
};

export default ProtectedRoute;
