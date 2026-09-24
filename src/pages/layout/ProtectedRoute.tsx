import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyPermissions } from '@/services/permissionsService';
import { RoutePageSkeleton } from '@/components/skeletons';

const ProtectedRoute: React.FC<{ permission?: string | string[]; superAdminOnly?: boolean; clientOnly?: boolean; noPermissionRedirect?: string }> = ({ permission, superAdminOnly, clientOnly, noPermissionRedirect = '/403' }) => {
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
  // Unified Portal — an INTERNAL user is also allowed on clientOnly (i.e.
  // /portal/*) routes now, alongside CLIENT. Per-project access is still
  // enforced server-side for every actual portal API call
  // (assertClientProjectAccess's INTERNAL branch) — this route-level check
  // only ever gated "logged in as the right kind of account", never a
  // specific project, so admitting INTERNAL here doesn't weaken anything;
  // it just lets them reach a project list the API correctly scopes down
  // to only what they're actually assigned to.
  const isInternalUser = user?.user_type === 'INTERNAL';

  if (clientOnly && !isClientUser && !isInternalUser) return <Navigate to="/403" replace />;

  if (!clientOnly && isClientUser) return <Navigate to="/portal" replace />;

  if (!permission && !superAdminOnly) return <Outlet />;

  if (superAdminOnly && !myPerms?.is_super_admin) return <Navigate to="/403" replace />;

  if (permission) {

    const required = Array.isArray(permission) ? permission : [permission];
    const hasPermission = myPerms?.is_super_admin || required.some((p) => myPerms?.permissions?.includes(p));
    if (!hasPermission) return <Navigate to={noPermissionRedirect} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
