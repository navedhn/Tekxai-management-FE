import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyPermissions, resolveHomePath } from '@/services/permissionsService';

const PublicRoute: React.FC = () => {
    const { isLoggedIn } = useAuth();

    const { data: myPerms, isLoading } = useMyPermissions();

    if (isLoggedIn) {
        if (isLoading) return null;
        const home = resolveHomePath(myPerms);
        if (home) return <Navigate to={home} replace />;

    }

    return <Outlet />;
};

export default PublicRoute;
