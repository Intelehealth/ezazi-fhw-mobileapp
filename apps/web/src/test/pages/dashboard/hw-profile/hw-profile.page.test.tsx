import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { success } from '@ezazi/api-client';
import HwProfilePage from '../../../../pages/dashboard/hw-profile/hw-profile.page';
import { profileService } from '../../../../services/profile.service';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import type { OpenMrsProvider } from '../../../../types/profile.types';
import type { AuthUser } from '../../../../types/auth.types';

vi.mock('../../../../services/profile.service', () => ({
  profileService: {
    getProvider: vi.fn(),
    getProviderAttributeTypes: vi.fn(),
    getLoginLocations: vi.fn(),
  },
}));

/* Same dual-React hoisting hazard dashboard.page.test.tsx documents. */
vi.mock('../../../../store/hooks', () => ({
  useAppSelector: vi.fn(),
  useAppDispatch: vi.fn(),
}));

const USER: AuthUser = {
  uuid: 'u-1',
  username: 'nurse1',
  displayName: 'Demo Nurse',
  roles: ['ORGANIZATIONAL: NURSE'],
  providerUuid: 'p-1',
  personUuid: 'per-1',
};

const PROVIDER: OpenMrsProvider = {
  uuid: 'p-1',
  person: {
    uuid: 'per-1',
    display: 'Demo Nurse',
    gender: 'F',
    age: 30,
    birthdate: '1995-04-12',
    preferredName: {
      uuid: 'name-1',
      givenName: 'Demo',
      middleName: 'K',
      familyName: 'Nurse',
    },
  },
  attributes: [],
};

function mockAuthState(user: AuthUser | null) {
  vi.mocked(useAppSelector).mockImplementation(selector =>
    selector({
      auth: { user, token: null, isAuthenticated: Boolean(user) },
      config: { data: null, error: null, lastFetched: null },
    })
  );
}

function renderHwProfilePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard/hw-profile']}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return render(<HwProfilePage />, { wrapper: Wrapper });
}

beforeEach(() => {
  vi.mocked(profileService.getProvider).mockResolvedValue(success(PROVIDER));
  vi.mocked(profileService.getProviderAttributeTypes).mockResolvedValue(
    success([])
  );
  vi.mocked(profileService.getLoginLocations).mockResolvedValue(success([]));
});

describe('HwProfilePage', () => {
  it('greets the signed-in nurse, renders the nurse profile and shows their photo in the header', async () => {
    mockAuthState(USER);
    vi.mocked(useAppDispatch).mockReturnValue(vi.fn());

    const { container } = renderHwProfilePage();

    expect(screen.getByText('Hello, Demo Nurse 👋')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByText('Demo Nurse').length).toBeGreaterThan(0)
    );
    await waitFor(() =>
      expect(
        container.querySelector('nav img[src*="/personimage/per-1"]')
      ).not.toBeNull()
    );
  });

  it('hides the global patient search for nurses', () => {
    mockAuthState(USER);
    vi.mocked(useAppDispatch).mockReturnValue(vi.fn());

    renderHwProfilePage();

    expect(
      screen.queryByPlaceholderText('Search by patient name or ID')
    ).not.toBeInTheDocument();
  });

  it('dispatches logout() when the sidebar Log-out row is clicked', async () => {
    mockAuthState(USER);
    const dispatch = vi.fn();
    vi.mocked(useAppDispatch).mockReturnValue(dispatch);

    renderHwProfilePage();
    await userEvent.click(screen.getByRole('button', { name: 'Log-out' }));

    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('falls back to "unknown user" when there is no signed-in user', () => {
    mockAuthState(null);
    vi.mocked(useAppDispatch).mockReturnValue(vi.fn());

    renderHwProfilePage();

    expect(screen.getByText('Hello, unknown user 👋')).toBeInTheDocument();
  });

  it('falls back to the username when the signed-in user has no display name', () => {
    mockAuthState({ ...USER, displayName: undefined as unknown as string });
    vi.mocked(useAppDispatch).mockReturnValue(vi.fn());

    renderHwProfilePage();

    expect(screen.getByText('Hello, nurse1 👋')).toBeInTheDocument();
  });
});
