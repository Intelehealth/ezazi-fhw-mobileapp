import { logout } from '../../../actions/auth.actions';
import { DashboardLayoutComponent } from '../../../components/layout/dashboard-layout.component';
import { useProviderProfile } from '../../../hooks/queries/useProviderProfile';
import { ChangePasswordComponent } from '../../../modules/dashboard/change-password/change-password.component';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

/**
 * `pages/*.page.tsx` per §3 — route target for /dashboard/change-password,
 * available to every role (the Angular sidebar shows it to nurses too).
 */
export default function ChangePasswordPage() {
  const user = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();
  /* Shares the ['provider-profile'] query, so the header avatar shows the doctor's photo. */
  const { data: providerProfile } = useProviderProfile();

  return (
    <DashboardLayoutComponent
      userName={user?.displayName ?? user?.username ?? 'unknown user'}
      avatarUrl={providerProfile?.profile.photoUrl ?? undefined}
      showPatientSearch={false}
      onLogout={() => dispatch(logout())}
    >
      <ChangePasswordComponent />
    </DashboardLayoutComponent>
  );
}
