import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyPermissions } from '@/services/permissionsService';

const ProtectedRoute: React.FC<{ permission?: string; superAdminOnly?: boolean }> = ({ permission, superAdminOnly }) => {
  const { isLoggedIn } = useAuth();
  const { data: myPerms, isLoading } = useMyPermissions();

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  if (isLoading) return null;

  if (!permission && !superAdminOnly) return <Outlet />;

  if (superAdminOnly && !myPerms?.is_super_admin) return <Navigate to="/403" replace />;

  if (permission) {
    const hasPermission = myPerms?.is_super_admin || myPerms?.permissions?.includes(permission);
    if (!hasPermission) return <Navigate to="/403" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
