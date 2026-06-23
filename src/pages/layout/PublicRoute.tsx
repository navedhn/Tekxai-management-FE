import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getRoleHomePath } from '@/constants/roles';

const PublicRoute: React.FC = () => {
    const { isLoggedIn, role } = useAuth();

    if (isLoggedIn) {
        return <Navigate to={getRoleHomePath(role)} replace />;
    }

    return <Outlet />;
};

export default PublicRoute;
