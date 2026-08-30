import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyPermissions, resolveHomePath } from '@/services/permissionsService';

const PublicRoute: React.FC = () => {
    const { isLoggedIn } = useAuth();
    // Capability-based, not role-based: the same resolveHomePath used by
    // Login.tsx and 403.tsx. While permissions are still loading, render
    // nothing rather than guessing a destination — avoids a flash to the
    // wrong workspace or an incorrect bounce back to /login.
    const { data: myPerms, isLoading } = useMyPermissions();

    if (isLoggedIn) {
        if (isLoading) return null;
        const home = resolveHomePath(myPerms);
        if (home) return <Navigate to={home} replace />;
        // Logged in but no workspace permission at all — fall through to
        // the public page rather than redirect-looping; ProtectedRoute
        // routes will still correctly deny any actual workspace route.
    }

    return <Outlet />;
};

export default PublicRoute;
