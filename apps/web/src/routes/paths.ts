/**
 * Single source of truth for route paths (migration guide §3). Only the
 * auth + root routes exist so far — extend this table module by module as
 * §7's phases are worked, matching the reference repo's ROUTES shape.
 */
export const ROUTES = {
  ROOT: '/',
  AUTH: {
    BASE: '/auth',
    LOGIN: 'login',
    FORGOT_USERNAME: 'forgot-username',
    FORGOT_PASSWORD: 'forgot-password',
  },
  // login.component.ts's real post-login targets (loginSuccess()). Both
  // routes currently render the same placeholder pages/dashboard/dashboard.page.tsx
  // (see routes/app.routes.tsx) — the real, role-specific dashboard modules
  // aren't migrated to apps/web yet.
  DASHBOARD: '/dashboard',
  DASHBOARD_HW_PROFILE: '/dashboard/hw-profile',
  NOT_FOUND: '*',
} as const;

/** Mirrors login.component.ts's loginSuccess() role branch. */
export function resolvePostLoginPath(isNurse: boolean): string {
  return isNurse ? ROUTES.DASHBOARD_HW_PROFILE : ROUTES.DASHBOARD;
}
