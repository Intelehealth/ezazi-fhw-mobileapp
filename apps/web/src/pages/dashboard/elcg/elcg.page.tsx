import { useParams } from 'react-router-dom';
import { logout } from '../../../actions/auth.actions';
import { DashboardLayoutComponent } from '../../../components/layout/dashboard-layout.component';
import { ElcgComponent } from '../../../modules/dashboard/elcg/elcg.component';
import { useProviderProfile } from '../../../hooks/queries/useProviderProfile';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

/**
 * `pages/*.page.tsx` per §3 — the route target for
 * `${ROUTES.DASHBOARD_ELCG}/:visitUuid`, composing the shared dashboard shell
 * around the WHO Labour Care Guide module, the same shape as
 * pages/dashboard/dashboard.page.tsx.
 */
export default function ElcgPage() {
  /* Always set: the route only matches with a visit uuid. */
  const { visitUuid = '' } = useParams<{ visitUuid: string }>();
  const user = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();
  /*
   * Shares the ['provider-profile'] query with ProfileComponent, so the header
   * avatar matches every other dashboard page.
   */
  const { data: providerProfile } = useProviderProfile();

  return (
    <DashboardLayoutComponent
      userName={user?.displayName ?? user?.username ?? 'unknown user'}
      avatarUrl={providerProfile?.profile.photoUrl ?? undefined}
      onLogout={() => dispatch(logout())}
    >
      <ElcgComponent visitUuid={visitUuid} />
    </DashboardLayoutComponent>
  );
}
