import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppSelector } from '../../store/hooks';

/**
 * `router` (app.routes.tsx's module-level `createBrowserRouter(...)`
 * singleton) reads `window.location` once, at module-eval time — so, like
 * env.test.ts/clients/index.test.ts, each starting path needs
 * `window.history.pushState` *before* a fresh `vi.resetModules()` +
 * dynamic `import()`, not one shared top-level import.
 *
 * store/hooks is mocked (not a real react-redux Provider) for the same
 * dual-React-hoisting reason as dashboard.page.test.tsx and
 * protected.route.test.tsx. useLogin is mocked too so this file only
 * exercises routing outcomes, not the login mutation itself (LoginComponent
 * has its own full suite) — avoids needing a QueryClientProvider here.
 */
/*
 * The real search box needs a QueryClient and has its own suite
 * (patient-search.component.test.tsx); this file only cares that the header
 * hosts it.
 */
vi.mock('../../components/layout/patient-search.component', () => ({
  PatientSearchComponent: () => (
    <input placeholder="Search by patient name or ID" />
  ),
}));

vi.mock('../../store/hooks', () => ({
  useAppSelector: vi.fn(),
  useAppDispatch: () => vi.fn(),
}));

/*
 * The dashboard/profile pages read the provider-profile query; this file only
 * checks which screen each route renders, so keep it pending (no QueryClient).
 */
vi.mock('../../hooks/queries/useProviderProfile', () => ({
  useProviderProfile: () => ({
    isPending: true,
    isError: false,
    data: undefined,
  }),
}));

vi.mock('../../hooks/mutations/useLogin', () => ({
  useLogin: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

function mockIsAuthenticated(isAuthenticated: boolean, roles: string[] = []) {
  vi.mocked(useAppSelector).mockImplementation(selector =>
    selector({
      auth: {
        user: isAuthenticated
          ? {
              uuid: 'u-1',
              username: 'doctor1',
              displayName: 'Demo Male Doctor',
              roles,
              providerUuid: 'p-1',
              personUuid: 'per-1',
            }
          : null,
        token: null,
        isAuthenticated,
      },
      config: { data: null, error: null, lastFetched: null },
    })
  );
}

async function renderAtPath(path: string) {
  vi.resetModules();
  window.history.pushState(null, '', path);
  const { AppRoutes } = await import('../../routes/app.routes');
  return render(<AppRoutes />);
}

describe('AppRoutes', () => {
  afterEach(() => {
    window.history.pushState(null, '', '/');
  });

  it('sends an unauthenticated visitor at / to the login page', async () => {
    mockIsAuthenticated(false);

    await renderAtPath('/');

    expect(
      await screen.findByRole('heading', { name: 'Login' })
    ).toBeInTheDocument();
  });

  it('renders the login page directly at /auth/login', async () => {
    mockIsAuthenticated(false);

    await renderAtPath('/auth/login');

    expect(
      await screen.findByRole('heading', { name: 'Login' })
    ).toBeInTheDocument();
  });

  it('redirects an authenticated visitor at / to the dashboard', async () => {
    mockIsAuthenticated(true);

    await renderAtPath('/');

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('renders the dashboard for an authenticated visitor at /dashboard', async () => {
    mockIsAuthenticated(true);

    await renderAtPath('/dashboard');

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('renders the nurse profile screen at /dashboard/hw-profile', async () => {
    mockIsAuthenticated(true, ['ORGANIZATIONAL: NURSE']);

    await renderAtPath('/dashboard/hw-profile');

    expect(await screen.findByText('Loading profile…')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('sends a nurse who opens /dashboard/profile to /dashboard/hw-profile', async () => {
    mockIsAuthenticated(true, ['ORGANIZATIONAL: NURSE']);

    await renderAtPath('/dashboard/profile');

    expect(await screen.findByText('Loading profile…')).toBeInTheDocument();
    await waitFor(() =>
      expect(window.location.pathname).toBe('/dashboard/hw-profile')
    );
  });

  it('keeps a doctor on /dashboard/profile', async () => {
    mockIsAuthenticated(true, ['ORGANIZATIONAL: DOCTOR']);

    await renderAtPath('/dashboard/profile');

    expect(await screen.findByText('Loading profile…')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/dashboard/profile');
  });

  it('redirects an unauthenticated visitor away from a protected route to login', async () => {
    mockIsAuthenticated(false);

    await renderAtPath('/dashboard');

    expect(
      await screen.findByRole('heading', { name: 'Login' })
    ).toBeInTheDocument();
  });

  it('renders the not-found page for an unmatched path', async () => {
    mockIsAuthenticated(false);

    await renderAtPath('/this-route-does-not-exist');

    expect(
      await screen.findByRole('heading', { name: '404' })
    ).toBeInTheDocument();
  });
});
