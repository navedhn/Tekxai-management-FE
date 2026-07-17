import React from 'react';
import { useMyPermissions } from '@/services/permissionsService';

interface Props {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PermissionGate({ permission, children, fallback = null }: Props) {
  const { data: myPerms } = useMyPermissions();
  const allowed = !!myPerms?.is_super_admin || !!myPerms?.permissions?.includes(permission);
  if (allowed) return <>{children}</>;
  return <>{fallback}</>;
}
