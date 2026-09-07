import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyPermissions, resolveHomePath } from '@/services/permissionsService';
import { RoutePageSkeleton } from '@/components/skeletons';

const PublicRoute: React.FC = () => {
    const { isLoggedIn } = useAuth();

    const { data: myPerms, isLoading } = useMyPermissions();

    if (isLoggedIn) {
        if (isLoading) return <RoutePageSkeleton />;
        const home = resolveHomePath(myPerms);
        if (home) return <Navigate to={home} replace />;

    }

    return <Outlet />;
};

export default PublicRoute;
