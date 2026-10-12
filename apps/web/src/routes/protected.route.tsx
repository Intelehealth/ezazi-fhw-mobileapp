import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { storage } from '../utils/storage';
import { ROUTES } from './paths';

/**
 * Auth guard (migration guide §6: replaces Angular route guards, reference
 * repo pattern is a wrapper component rather than a class guard). Checks
 * Redux first, and falls back to localStorage so a hard refresh on a
 * protected route doesn't bounce to /auth/login before Redux would have
 * rehydrated from it in a later pass (persistence isn't wired up yet).
 */
export function ProtectedRoute() {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const hasStoredToken = Boolean(storage.getAuthToken());

  if (!isAuthenticated && !hasStoredToken) {
    return <Navigate to={`${ROUTES.AUTH.BASE}/${ROUTES.AUTH.LOGIN}`} replace />;
  }

  return <Outlet />;
}
