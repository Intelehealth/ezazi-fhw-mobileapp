import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '../../routes/protected.route';
import { useAppSelector } from '../../store/hooks';
import { storage } from '../../utils/storage';

// Mocked rather than wired to a real react-redux Provider — see
// dashboard.page.test.tsx's note on this monorepo's dual-React hoisting
// hazard with react-redux's useSyncExternalStore-based useSelector.
vi.mock('../../store/hooks', () => ({ useAppSelector: vi.fn() }));

function mockIsAuthenticated(isAuthenticated: boolean) {
  vi.mocked(useAppSelector).mockImplementation(selector =>
    selector({
      auth: { user: null, token: null, isAuthenticated },
      config: { data: null, error: null, lastFetched: null },
    })
  );
}

function renderProtected(initialPath: string) {
  const router = createMemoryRouter(
    [
      { path: '/auth/login', element: <p>Login page</p> },
      {
        element: <ProtectedRoute />,
        children: [{ path: '/dashboard', element: <p>Dashboard page</p> }],
      },
    ],
    { initialEntries: [initialPath] }
  );
  return render(<RouterProvider router={router} />);
}

describe('ProtectedRoute', () => {
  it('redirects to /auth/login when neither Redux nor localStorage has a session', async () => {
    mockIsAuthenticated(false);

    renderProtected('/dashboard');

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('renders the protected route when Redux says the user is authenticated', async () => {
    mockIsAuthenticated(true);

    renderProtected('/dashboard');

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });

  it('renders the protected route on a stored token even before Redux rehydrates', async () => {
    mockIsAuthenticated(false);
    storage.setAuthToken('tok-from-a-previous-session');

    renderProtected('/dashboard');

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });
});
