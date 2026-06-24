import React from 'react';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PermissionGate({ children, fallback = null }: Props) {
  const { role } = useAuth();
  // SUPER_ADMIN and ADMIN always pass; for others render fallback
  if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'HR') return <>{children}</>;
  return <>{fallback}</>;
}
