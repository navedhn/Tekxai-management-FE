import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyPermissions } from '@/services/permissionsService';
import { RoutePageSkeleton } from '@/components/skeletons';

const ProtectedRoute: React.FC<{ permission?: string | string[]; superAdminOnly?: boolean; clientOnly?: boolean }> = ({ permission, superAdminOnly, clientOnly }) => {
  const { isLoggedIn, user, hasHydrated } = useAuth();
  const { data: myPerms, isLoading } = useMyPermissions();

  // Before the persisted auth store has rehydrated from localStorage,
  // isLoggedIn still holds its initial `false` value — deciding on it here
  // would redirect an actually-logged-in user to /login on every hard page
  // load/reload (e.g. after a stale-chunk auto-reload), a false "logout".
  if (!hasHydrated) return <RoutePageSkeleton />;

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  if (isLoading) return <RoutePageSkeleton />;

  const isClientUser = user?.user_type === 'CLIENT';

  if (clientOnly && !isClientUser) return <Navigate to="/403" replace />;

  if (!clientOnly && isClientUser) return <Navigate to="/portal" replace />;

  if (!permission && !superAdminOnly) return <Outlet />;

  if (superAdminOnly && !myPerms?.is_super_admin) return <Navigate to="/403" replace />;

  if (permission) {

    const required = Array.isArray(permission) ? permission : [permission];
    const hasPermission = myPerms?.is_super_admin || required.some((p) => myPerms?.permissions?.includes(p));
    if (!hasPermission) return <Navigate to="/403" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
