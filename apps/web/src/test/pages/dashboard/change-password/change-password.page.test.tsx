import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChangePasswordPage from '../../../../pages/dashboard/change-password/change-password.page';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import type { AuthUser } from '../../../../types/auth.types';

const providerProfile = vi.hoisted(() => ({
  data: undefined as { profile: { photoUrl: string | null } } | undefined,
}));

vi.mock('../../../../hooks/queries/useProviderProfile', () => ({
  useProviderProfile: () => providerProfile,
}));

/*
 * The form itself has its own suite (change-password.component.test.tsx) and
 * needs a QueryClient; this file only checks the page shell around it.
 */
vi.mock(
  '../../../../modules/dashboard/change-password/change-password.component',
  () => ({
    ChangePasswordComponent: () => <p>change-password-form</p>,
  })
);

/*
 * The search box needs a QueryClient too and has its own suite; the header
 * only has to host it.
 */
vi.mock('../../../../components/layout/patient-search.component', () => ({
  PatientSearchComponent: () => (
    <input placeholder="Search by patient name or ID" />
  ),
}));

/* Same dual-React hoisting hazard dashboard.page.test.tsx documents. */
vi.mock('../../../../store/hooks', () => ({
  useAppSelector: vi.fn(),
  useAppDispatch: vi.fn(),
}));

const USER: AuthUser = {
  uuid: 'u-1',
  username: 'doctor1',
  displayName: 'Demo Male Doctor',
  roles: ['ORGANIZATIONAL: DOCTOR'],
  providerUuid: 'p-1',
  personUuid: 'per-1',
};

function mockAuthState(user: AuthUser | null) {
  vi.mocked(useAppSelector).mockImplementation(selector =>
    selector({
      auth: { user, token: null, isAuthenticated: Boolean(user) },
      config: { data: null, error: null, lastFetched: null },
    })
  );
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/change-password']}>
      <ChangePasswordPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  providerProfile.data = undefined;
  vi.mocked(useAppDispatch).mockReturnValue(vi.fn());
});

describe('ChangePasswordPage', () => {
  it('greets the signed-in user and renders the change-password form', () => {
    mockAuthState(USER);

    renderPage();

    expect(screen.getByText('Hello, Demo Male Doctor 👋')).toBeInTheDocument();
    expect(screen.getByText('change-password-form')).toBeInTheDocument();
  });

  it("shows the user's photo in the header once the profile has loaded", () => {
    mockAuthState(USER);
    providerProfile.data = { profile: { photoUrl: '/personimage/per-1' } };

    const { container } = renderPage();

    expect(
      container.querySelector('nav img[src="/personimage/per-1"]')
    ).not.toBeNull();
  });

  it('dispatches logout() once the sidebar Log-out is confirmed with Yes', async () => {
    mockAuthState(USER);
    const dispatch = vi.fn();
    vi.mocked(useAppDispatch).mockReturnValue(dispatch);

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Log-out' }));
    expect(dispatch).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }));

    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('does not show the patient search on this page', () => {
    mockAuthState(USER);

    renderPage();

    expect(
      screen.queryByPlaceholderText('Search by patient name or ID')
    ).not.toBeInTheDocument();
  });

  it('falls back to "unknown user" when there is no signed-in user', () => {
    mockAuthState(null);

    renderPage();

    expect(screen.getByText('Hello, unknown user 👋')).toBeInTheDocument();
  });

  it('falls back to the username when the signed-in user has no display name', () => {
    mockAuthState({ ...USER, displayName: undefined as unknown as string });

    renderPage();

    expect(screen.getByText('Hello, doctor1 👋')).toBeInTheDocument();
  });
});
