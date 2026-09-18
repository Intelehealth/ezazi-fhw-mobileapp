import { Suspense, lazy } from 'react';
import {
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom';
import { ROUTES } from './paths';
import { ProtectedRoute } from './protected.route';

const RouteLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    Loading…
  </div>
);

const LoginPage = lazy(() => import('../pages/auth/login/login.page'));
const HomePage = lazy(() => import('../pages/home/home.page'));
const NotFoundPage = lazy(() => import('../pages/not-found/not-found.page'));

/**
 * `createBrowserRouter`, not the reference repo's `createHashRouter` — no
 * nginx/static-host hash-routing constraint has been confirmed for eZAZI
 * (migration guide §8 flags this as an open decision to make explicitly).
 * Switch to createHashRouter here if that constraint turns out to apply.
 */
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path={ROUTES.AUTH.BASE}>
        <Route
          path={ROUTES.AUTH.LOGIN}
          element={
            <Suspense fallback={<RouteLoader />}>
              <LoginPage />
            </Suspense>
          }
        />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route
          path={ROUTES.ROOT}
          element={
            <Suspense fallback={<RouteLoader />}>
              <HomePage />
            </Suspense>
          }
        />
      </Route>

      <Route
        path={ROUTES.NOT_FOUND}
        element={
          <Suspense fallback={<RouteLoader />}>
            <NotFoundPage />
          </Suspense>
        }
      />
    </>
  )
);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
