import { Suspense, lazy } from 'react';
import {
  Navigate,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom';
import { AuthLayoutComponent } from '../components/layout/auth-layout.component';
import { RouteErrorBoundary } from '../components/common/route-error-boundary.component';
import { ROUTES } from './paths';
import { ProtectedRoute } from './protected.route';

const RouteLoader = () => (
  <div className="flex min-h-screen items-center justify-center">Loading…</div>
);

const LoginPage = lazy(() => import('../pages/auth/login/login.page'));
const ForgotUsernamePage = lazy(
  () => import('../pages/auth/forgot-username/forgot-username.page')
);
const ForgotPasswordPage = lazy(
  () => import('../pages/auth/forgot-password/forgot-password.page')
);
const VerificationMethodPage = lazy(
  () => import('../pages/auth/verification-method/verification-method.page')
);
const OtpVerificationPage = lazy(
  () => import('../pages/auth/otp-verification/otp-verification.page')
);
const SetupNewPasswordPage = lazy(
  () => import('../pages/auth/setup-new-password/setup-new-password.page')
);
const DashboardPage = lazy(() => import('../pages/dashboard/dashboard.page'));
const NotFoundPage = lazy(() => import('../pages/not-found/not-found.page'));

/**
 * `createBrowserRouter`, not the reference repo's `createHashRouter` — no
 * nginx/static-host hash-routing constraint has been confirmed for eZAZI
 * (migration guide §8 flags this as an open decision to make explicitly).
 * Switch to createHashRouter here if that constraint turns out to apply.
 */
const router = createBrowserRouter(
  createRoutesFromElements(
    // One boundary wrapping every route (no path/element of its own, so it
    // just renders an Outlet) — a render, loader, or action error anywhere
    // below bubbles up here instead of blanking the page.
    <Route errorElement={<RouteErrorBoundary />}>
      <Route element={<AuthLayoutComponent />}>
        <Route path={ROUTES.AUTH.BASE}>
          <Route
            path={ROUTES.AUTH.LOGIN}
            element={
              <Suspense fallback={<RouteLoader />}>
                <LoginPage />
              </Suspense>
            }
          />
          <Route
            path={ROUTES.AUTH.FORGOT_USERNAME}
            element={
              <Suspense fallback={<RouteLoader />}>
                <ForgotUsernamePage />
              </Suspense>
            }
          />
          <Route
            path={ROUTES.AUTH.FORGOT_PASSWORD}
            element={
              <Suspense fallback={<RouteLoader />}>
                <ForgotPasswordPage />
              </Suspense>
            }
          />
          <Route
            path={ROUTES.AUTH.VERIFICATION_METHOD}
            element={
              <Suspense fallback={<RouteLoader />}>
                <VerificationMethodPage />
              </Suspense>
            }
          />
          <Route
            path={ROUTES.AUTH.OTP_VERIFICATION}
            element={
              <Suspense fallback={<RouteLoader />}>
                <OtpVerificationPage />
              </Suspense>
            }
          />
          <Route
            path={ROUTES.AUTH.SETUP_NEW_PASSWORD}
            element={
              <Suspense fallback={<RouteLoader />}>
                <SetupNewPasswordPage />
              </Suspense>
            }
          />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        {/* ProtectedRoute already bounces unauthenticated visitors to
            /auth/login, so this only ever runs for a signed-in user — send
            them on to the real dashboard rather than rendering anything at "/". */}
        <Route
          path={ROUTES.ROOT}
          element={<Navigate to={ROUTES.DASHBOARD} replace />}
        />
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <Suspense fallback={<RouteLoader />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.DASHBOARD_HW_PROFILE}
          element={
            <Suspense fallback={<RouteLoader />}>
              <DashboardPage />
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
    </Route>
  )
);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
