'use client';

import { useAuth } from './useAuth';
import type { Role } from '@/types';
import { ROLE_PERMISSIONS } from '@/types';

export function useRBAC() {
  const { role, loading } = useAuth();

  const can = (permission: string): boolean => {
    if (loading) return false;
    if (role === 'super_admin' || role === 'clinic_admin') return true;
    if (!role) return false;
    const permissions = ROLE_PERMISSIONS[role] ?? [];
    if (permissions.includes('*')) return true;
    return permissions.some(
      (p) => p === permission || p.startsWith(permission + ':') || permission.startsWith(p)
    );
  };

  const hasRole = (...roles: Role[]): boolean => {
    if (!role) return false;
    return roles.includes(role);
  };

  const isSuperAdmin = () => role === 'super_admin';
  const isClinicAdmin = () => role === 'clinic_admin';
  const isDoctor = () => role === 'doctor';
  const isStaff = () => role === 'staff';
  const isPatient = () => role === 'patient';

  return { can, hasRole, isSuperAdmin, isClinicAdmin, isDoctor, isStaff, isPatient, role };
}
