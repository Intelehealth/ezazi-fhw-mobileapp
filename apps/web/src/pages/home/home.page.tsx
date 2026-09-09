import { logout } from '../../actions/auth.actions';
import { Button } from '../../components/common/button.component';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

/**
 * Placeholder authenticated landing page — proves the ProtectedRoute +
 * login round-trip end-to-end. Not a real module: the actual dashboard
 * (migration guide §6/§7 phase 5) is deliberately out of scope for this
 * pass — see the scaffold report for what to build next.
 */
export default function HomePage() {
  const user = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();

  return (
    <div className="p-6">
      <p className="mb-4">
        Logged in as {user?.displayName ?? user?.username ?? 'unknown user'}.
      </p>
      <div className="max-w-[160px]">
        <Button onClick={() => dispatch(logout())}>Log out</Button>
      </div>
    </div>
  );
}
