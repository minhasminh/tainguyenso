import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { PermissionDenied } from './PermissionDenied';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { profile, role } = useAuth();

  const currentRole = role || profile?.role;

  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return <PermissionDenied allowedRoles={allowedRoles} currentRole={currentRole} />;
  }

  return <>{children}</>;
}
