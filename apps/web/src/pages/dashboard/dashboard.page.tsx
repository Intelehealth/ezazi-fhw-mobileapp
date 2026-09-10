import { logout } from '../../actions/auth.actions';
import { Button } from '../../components/common/button.component';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

/**
 * Simple placeholder dashboard — the real post-login landing page
 * (migration guide §6/§7 phase 5's actual dashboard module is still out of
 * scope for this pass). Mounted at both ROUTES.DASHBOARD and
 * ROUTES.DASHBOARD_HW_PROFILE (see routes/app.routes.tsx): the nurse-specific
 * hw-profile dashboard doesn't exist yet either, so both roles land here for
 * now — split them once that module is actually built.
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
    <div className="p-6">
      <h1 className="mb-2 text-xl font-semibold">Dashboard</h1>
      <p className="mb-4">
        Logged in as {user?.displayName ?? user?.username ?? 'unknown user'}.
      </p>
      <div className="max-w-[160px]">
        <Button onClick={() => dispatch(logout())}>Log out</Button>
      </div>
    </div>
  );
}
