import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/constants/roles';
import { getRoleHomePath } from '@/constants/roles';

const ProtectedRoute: React.FC<{ roles?: UserRole[] }> = ({ roles }) => {
  const { isLoggedIn, role } = useAuth();

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  const hasRequiredRole = !roles?.length || (role != null && roles.includes(role as UserRole));
  if (!hasRequiredRole) {
    return <Navigate to={getRoleHomePath(role)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
