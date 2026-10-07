import { logout } from '../../../actions/auth.actions';
import { DashboardLayoutComponent } from '../../../components/layout/dashboard-layout.component';
import { useProviderProfile } from '../../../hooks/queries/useProviderProfile';
import { HwProfileComponent } from '../../../modules/dashboard/hw-profile/hw-profile.component';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

/**
 * `pages/*.page.tsx` per §3 — route target for nurses' profile screen
 * (/dashboard/hw-profile), the counterpart of pages/dashboard/profile/profile.page.tsx.
 */
export default function HwProfilePage() {
  const user = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();
  /*
   * Shares the ['provider-profile'] query with HwProfileComponent, so the
   * header avatar updates the moment a new photo is uploaded.
   */
  const { data: providerProfile } = useProviderProfile();

  return (
    <DashboardLayoutComponent
      userName={user?.displayName ?? user?.username ?? 'unknown user'}
      avatarUrl={providerProfile?.profile.photoUrl ?? undefined}
      onLogout={() => dispatch(logout())}
    >
      <HwProfileComponent />
    </DashboardLayoutComponent>
  );
}
