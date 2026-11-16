import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ElcgPage from '../../../../pages/dashboard/elcg/elcg.page';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import type { AuthUser } from '../../../../types/auth.types';

/*
 * store/hooks is mocked rather than wired to a real react-redux Provider, for
 * the dual-React reason explained in dashboard.page.test.tsx.
 */
vi.mock('../../../../store/hooks', () => ({
  useAppSelector: vi.fn(),
  useAppDispatch: vi.fn(),
}));

/* The header avatar reads the profile query; its own suite covers the hook. */
const providerProfile = vi.hoisted(() => ({
  data: undefined as { profile: { photoUrl: string | null } } | undefined,
}));
vi.mock('../../../../hooks/queries/useProviderProfile', () => ({
  useProviderProfile: () => providerProfile,
}));

/* The real search box needs a QueryClient and has its own suite. */
vi.mock('../../../../components/layout/patient-search.component', () => ({
  PatientSearchComponent: () => (
    <input placeholder="Search by patient name or ID" />
  ),
}));

/* Only the visit uuid handed down matters here; the module has its own suite. */
vi.mock('../../../../modules/dashboard/elcg/elcg.component', () => ({
  ElcgComponent: ({ visitUuid }: { visitUuid: string }) => (
    <p>LCG for {visitUuid}</p>
  ),
}));

const USER: AuthUser = {
  uuid: 'u-1',
  username: 'doctor1',
  displayName: 'Demo Male Doctor',
  roles: ['ORGANIZATIONAL: DOCTOR'],
  providerUuid: 'p-1',
  personUuid: 'per-1',
};

function renderElcgPage(user: AuthUser | null = USER) {
  vi.mocked(useAppSelector).mockImplementation(selector =>
    selector({
      auth: {
        user,
        token: null,
        isAuthenticated: true,
      },
      config: { data: null, error: null, lastFetched: null },
    })
  );
  return render(
    <MemoryRouter initialEntries={['/dashboard/elcg/visit-42']}>
      <Routes>
        <Route path="/dashboard/elcg/:visitUuid" element={<ElcgPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ElcgPage', () => {
  it("renders the visit's guide inside the dashboard shell", () => {
    vi.mocked(useAppDispatch).mockReturnValue(vi.fn());

    renderElcgPage();

    expect(screen.getByText('LCG for visit-42')).toBeInTheDocument();
    expect(screen.getByText('Hello, Demo Male Doctor 👋')).toBeInTheDocument();
  });

  it('dispatches logout() once the sidebar Log-out is confirmed with Yes', async () => {
    const dispatch = vi.fn();
    vi.mocked(useAppDispatch).mockReturnValue(dispatch);

    renderElcgPage();
    await userEvent.click(screen.getByRole('button', { name: 'Log-out' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }));

    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('falls back to "unknown user" when there is no signed-in user', () => {
    vi.mocked(useAppDispatch).mockReturnValue(vi.fn());

    renderElcgPage(null);

    expect(screen.getByText('Hello, unknown user 👋')).toBeInTheDocument();
  });

  it('falls back to the username when the signed-in user has no display name', () => {
    vi.mocked(useAppDispatch).mockReturnValue(vi.fn());

    renderElcgPage({ ...USER, displayName: undefined as unknown as string });

    expect(screen.getByText('Hello, doctor1 👋')).toBeInTheDocument();
  });

  it("shows the doctor's photo in the header once the profile has loaded", () => {
    vi.mocked(useAppDispatch).mockReturnValue(vi.fn());
    providerProfile.data = { profile: { photoUrl: '/personimage/per-1' } };

    try {
      const { container } = renderElcgPage();

      expect(
        container.querySelector('nav img[src="/personimage/per-1"]')
      ).not.toBeNull();
    } finally {
      providerProfile.data = undefined;
    }
  });
});
