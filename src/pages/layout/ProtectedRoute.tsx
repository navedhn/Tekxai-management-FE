import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/constants/roles';

/**
 * Guards a route behind authentication and optional role checks.
 * - Not logged in  → /login
 * - Wrong role     → /403 (stays logged in)
 * - Authorized     → renders children via <Outlet />
 */
const ProtectedRoute: React.FC<{ roles?: UserRole[] }> = ({ roles }) => {
  const { isLoggedIn, role } = useAuth();

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  const hasRequiredRole = !roles?.length || (role != null && roles.includes(role as UserRole));
  if (!hasRequiredRole) {
    return <Navigate to="/403" replace state={{ from: roles }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
