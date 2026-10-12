import { logout } from '../../../actions/auth.actions';
import { DashboardLayoutComponent } from '../../../components/layout/dashboard-layout.component';
import { ProfileComponent } from '../../../modules/dashboard/profile/profile.component';
import { useProviderProfile } from '../../../hooks/queries/useProviderProfile';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

/**
 * `pages/*.page.tsx` per §3 — thin route target composing the shared
 * dashboard shell (see components/layout/dashboard-layout.component.tsx)
 * around the profile module, the same shape as pages/dashboard/dashboard.page.tsx.
 */
export default function ProfilePage() {
  const user = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();
  /*
   * Shares the ['provider-profile'] query with ProfileComponent, so the header
   * avatar updates the moment a new photo is uploaded.
   */
  const { data: providerProfile } = useProviderProfile();

  return (
    <DashboardLayoutComponent
      userName={user?.displayName ?? user?.username ?? 'unknown user'}
      avatarUrl={providerProfile?.profile.photoUrl ?? undefined}
      onLogout={() => dispatch(logout())}
    >
      <ProfileComponent />
    </DashboardLayoutComponent>
  );
}
