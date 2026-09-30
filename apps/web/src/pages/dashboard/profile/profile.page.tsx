import { logout } from '../../../actions/auth.actions';
import { DashboardLayoutComponent } from '../../../components/layout/dashboard-layout.component';
import { ProfileComponent } from '../../../modules/dashboard/profile/profile.component';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

/**
 * `pages/*.page.tsx` per §3 — thin route target composing the shared
 * dashboard shell (see components/layout/dashboard-layout.component.tsx)
 * around the profile module, the same shape as pages/dashboard/dashboard.page.tsx.
 */
export default function ProfilePage() {
  const user = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();

  return (
    <DashboardLayoutComponent
      userName={user?.displayName ?? user?.username ?? 'unknown user'}
      onLogout={() => dispatch(logout())}
    >
      <ProfileComponent />
    </DashboardLayoutComponent>
  );
}
