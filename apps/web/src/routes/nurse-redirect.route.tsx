import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useIsNurse } from '../hooks/useIsNurse';

/**
 * Ports dashboard-routing.module.ts's NgxPermissionsGuard on /dashboard/profile
 * (`except: ['ORGANIZATIONAL: NURSE'], redirectTo: '/dashboard/hw-profile'`):
 * nurses never see the doctor profile, they're sent to their own screen.
 */
export function NurseRedirect({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return useIsNurse() ? <Navigate to={to} replace /> : <>{children}</>;
}
