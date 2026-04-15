import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const PublicRoute: React.FC = () => {
    const { isLoggedIn, role } = useAuth();

    if (isLoggedIn) {
        // If already logged in, redirect based on role
        if (role === 'ADMIN') {
            return <Navigate to="/admin" replace />;
        }
        return <Navigate to="/employee" replace />;
    }

    // If not logged in, allow access to public routes (Login/Register)
    return <Outlet />;
};

export default PublicRoute;
