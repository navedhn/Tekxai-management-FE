import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/constants/roles';
import { useMyPermissions } from '@/services/permissionsService';

const ProtectedRoute: React.FC<{ roles?: UserRole[]; permission?: string }> = ({ roles, permission }) => {
  const { isLoggedIn } = useAuth();
  const { data: myPerms, isLoading } = useMyPermissions();

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  // authStore.role is a client-persisted snapshot (localStorage) and must
  // never be trusted to grant access on its own — it's directly editable via
  // DevTools. myPerms is fetched live from GET /permission/me (react-query)
  // and reflects the server's verified-JWT view of the user's roles/
  // permissions; it is the only source this component grants access from.
  // Access is withheld (render nothing) until that fetch resolves, rather
  // than falling back to the stale store value.
  if (isLoading) return null;

  const liveRoles = myPerms?.roles || [];
  const hasRequiredRole = !roles?.length || liveRoles.some((r) => roles.includes(r as UserRole));
  if (hasRequiredRole) return <Outlet />;

  if (permission) {
    const hasPermission = myPerms?.is_super_admin || myPerms?.permissions?.includes(permission);
    if (hasPermission) return <Outlet />;
  }

  return <Navigate to="/403" replace />;
};

export default ProtectedRoute;
