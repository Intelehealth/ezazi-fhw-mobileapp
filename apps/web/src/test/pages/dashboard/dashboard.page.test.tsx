import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DashboardPage from '../../../pages/dashboard/dashboard.page';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import type { AuthUser } from '../../../types/auth.types';

// Mocked rather than wired to a real react-redux Provider: this monorepo
// hoists a second, older React copy to the workspace root (see
// vitest.config.ts's dual-React hazard note), and react-redux's useSelector
// — built on use-sync-external-store — resolves that root copy internally
// when the package itself is only installed at the root. That mismatch
// throws "Cannot read properties of null (reading 'useRef')" from inside
// react-redux, unrelated to anything this component does. Mocking
// store/hooks tests DashboardPage's own logic without depending on that
// still-open tooling gap.
vi.mock('../../../store/hooks', () => ({
  useAppSelector: vi.fn(),
  useAppDispatch: vi.fn(),
}));

const USER: AuthUser = {
  uuid: 'u-1',
  username: 'doctor1',
  displayName: 'Demo Male Doctor',
  roles: ['ORGANIZATIONAL: DOCTOR'],
};

function mockAuthState(user: AuthUser | null) {
  vi.mocked(useAppSelector).mockImplementation(selector =>
    selector({
      auth: { user, token: null, isAuthenticated: Boolean(user) },
      config: { data: null, error: null, lastFetched: null },
    })
  );
}

describe('DashboardPage', () => {
  it('greets the signed-in user by display name', () => {
    mockAuthState(USER);
    vi.mocked(useAppDispatch).mockReturnValue(vi.fn());

    render(<DashboardPage />);

    expect(
      screen.getByText('Logged in as Demo Male Doctor.')
    ).toBeInTheDocument();
  });

  it('falls back to "unknown user" when there is no signed-in user', () => {
    mockAuthState(null);
    vi.mocked(useAppDispatch).mockReturnValue(vi.fn());

    render(<DashboardPage />);

    expect(screen.getByText('Logged in as unknown user.')).toBeInTheDocument();
  });

  it('falls back to the username when the signed-in user has no display name', () => {
    // displayName is typed as required on AuthUser, but the fallback chain
    // exists defensively for data the backend doesn't strictly guarantee —
    // the cast below constructs exactly that "missing at runtime" case.
    mockAuthState({
      ...USER,
      displayName: undefined as unknown as string,
    });
    vi.mocked(useAppDispatch).mockReturnValue(vi.fn());

    render(<DashboardPage />);

    expect(screen.getByText('Logged in as doctor1.')).toBeInTheDocument();
  });

  it('dispatches logout() on button click', async () => {
    mockAuthState(USER);
    const dispatch = vi.fn();
    vi.mocked(useAppDispatch).mockReturnValue(dispatch);

    render(<DashboardPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
