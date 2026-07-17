import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/constants/roles';
import { useMyPermissions } from '@/services/permissionsService';

const ProtectedRoute: React.FC<{ roles?: UserRole[]; permission?: string }> = ({ roles, permission }) => {
  const { isLoggedIn, role } = useAuth();
  const { data: myPerms, isLoading } = useMyPermissions();

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  // authStore.role is a snapshot taken at login and never refreshed — if an
  // admin changes this user's role server-side, the stale value would let
  // them keep passing this check indefinitely until they log out manually.
  // myPerms.roles is fetched live (react-query) and reflects the DB, so once
  // it has loaded it is treated as the source of truth; the stale store
  // value is only used as a fallback before the first fetch resolves.
  const liveRoles = myPerms?.roles;
  const hasRequiredRole = !roles?.length || (
    liveRoles
      ? liveRoles.some((r) => roles.includes(r as UserRole))
      : (role != null && roles.includes(role as UserRole))
  );

  // If role check passes, allow immediately (no need to wait for permissions)
  if (hasRequiredRole) return <Outlet />;

  // If a permission override can grant access, wait for permissions to load
  if (permission) {
    if (isLoading) return null;
    const hasPermission = myPerms?.is_super_admin || myPerms?.permissions?.includes(permission);
    if (hasPermission) return <Outlet />;
  }

  return <Navigate to="/403" replace />;
};

export default ProtectedRoute;
