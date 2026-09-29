import { logout } from '../../actions/auth.actions';
import { DashboardLayoutComponent } from '../../components/layout/dashboard-layout.component';
import { DashboardComponent } from '../../modules/dashboard/dashboard.component';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

/**
 * The ELCG doctor's post-login landing page — main-container.component.html's
 * sidebar/header shell (see components/layout/dashboard-layout.component.tsx)
 * wrapping dashboard.component.html's stat chips + case tables (see
 * modules/dashboard/dashboard.component.tsx). Mounted at both ROUTES.DASHBOARD
 * and ROUTES.DASHBOARD_HW_PROFILE (see routes/app.routes.tsx): the
 * nurse-specific hw-profile dashboard doesn't exist yet either, so both
 * roles land here for now — split them once that module is actually built.
 *
 * Supersedes the old pages/home/home.page.tsx, which proved the same
 * ProtectedRoute + login round-trip but was mounted at "/" — a path
 * hooks/mutations/useLogin.ts never actually redirects to, so nobody could
 * reach it after a real login.
 */
export default function DashboardPage() {
  const user = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();

  return (
    <DashboardLayoutComponent
      userName={user?.displayName ?? user?.username ?? 'unknown user'}
      onLogout={() => dispatch(logout())}
    >
      <DashboardComponent />
    </DashboardLayoutComponent>
  );
}
