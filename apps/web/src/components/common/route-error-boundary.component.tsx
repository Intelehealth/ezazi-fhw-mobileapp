import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import { Button } from './button.component';

function describeError(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong.';
}

/**
 * Route-level error boundary — react-router-dom v7 data-router `errorElement`.
 * It catches any error thrown while rendering, or in a loader/action, for
 * the routes it wraps (see routes/app.routes.tsx, where one instance wraps
 * the whole route tree so a single boundary covers every page instead of
 * needing one per route). Unmatched paths still fall through to the
 * `NOT_FOUND` route, not here — that only changes if the `*` route is ever
 * removed.
 *
 * No error-reporting service is wired up yet (migration guide has no
 * decision on one) — console.error is the only sink for now, so failures
 * aren't silent in production even though there's no dashboard for them yet.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  console.error('Route error:', error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-gray-600">{describeError(error)}</p>
      <Button className="w-auto px-6" onClick={() => navigate(ROUTES.ROOT)}>
        Go to home
      </Button>
    </div>
  );
}
