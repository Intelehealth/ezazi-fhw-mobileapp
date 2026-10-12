import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useProviderProfile } from '../../../hooks/queries/useProviderProfile';
import { profileService } from '../../../services/profile.service';
import { useAppSelector } from '../../../store/hooks';
import type {
  OpenMrsLocation,
  OpenMrsProvider,
  ProviderAttributeType,
} from '../../../types/profile.types';
import type { AuthUser } from '../../../types/auth.types';

vi.mock('../../../services/profile.service', () => ({
  profileService: {
    getProvider: vi.fn(),
    getProviderAttributeTypes: vi.fn(),
    getLoginLocations: vi.fn(),
  },
}));

// Real react-redux + a real Provider crashes here with "Cannot read
// properties of null (reading 'useRef')" — the monorepo hoists a second,
// older React copy to the workspace root, and react-redux's useSelector
// (built on use-sync-external-store) resolves that root copy internally.
// Same dual-React hazard dashboard.page.test.tsx works around; mocking
// store/hooks instead tests this hook's own logic without depending on it.
vi.mock('../../../store/hooks', () => ({
  useAppSelector: vi.fn(),
}));

const USER: AuthUser = {
  uuid: 'u-1',
  username: 'doctor1',
  displayName: 'Demo Male Doctor',
  roles: ['ORGANIZATIONAL: DOCTOR'],
  providerUuid: 'p-1',
  personUuid: 'per-1',
};

const PROVIDER: OpenMrsProvider = {
  uuid: 'p-1',
  person: {
    uuid: 'per-1',
    display: 'Demo Male Doctor',
    gender: 'M',
    age: 38,
    // A full ISO datetime, not a plain date — this is what OpenMRS's REST
    // API actually returns (see useProviderProfile.ts's toDateOnly).
    birthdate: '1988-04-12T00:00:00.000+0000',
    preferredName: {
      uuid: 'name-1',
      givenName: 'Demo',
      middleName: 'K',
      familyName: 'Doctor',
    },
  },
  attributes: [
    {
      uuid: 'attr-email',
      attributeType: { uuid: 'type-emailId', display: 'emailId' },
      value: 'demo@example.com',
      voided: false,
    },
    {
      uuid: 'attr-email-old',
      attributeType: { uuid: 'type-emailId', display: 'emailId' },
      value: 'stale@example.com',
      voided: true,
    },
  ],
};

const ATTRIBUTE_TYPES: ProviderAttributeType[] = [
  { uuid: 'type-emailId', display: 'emailId' },
  { uuid: 'type-phoneNumber', display: 'phoneNumber' },
];

const LOCATIONS: OpenMrsLocation[] = [
  { uuid: 'loc-1', display: 'Ason Primary Health Care Centre' },
];

function makeWrapper() {
  vi.mocked(useAppSelector).mockImplementation(selector =>
    selector({
      auth: { user: USER, token: 'tok-123', isAuthenticated: true },
      config: { data: null, error: null, lastFetched: null },
    })
  );

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return wrapper;
}

describe('useProviderProfile', () => {
  it('maps the OpenMRS provider + attribute types + facilities into a DoctorProfile', async () => {
    vi.mocked(profileService.getProvider).mockResolvedValue({
      ok: true,
      data: PROVIDER,
    });
    vi.mocked(profileService.getProviderAttributeTypes).mockResolvedValue({
      ok: true,
      data: ATTRIBUTE_TYPES,
    });
    vi.mocked(profileService.getLoginLocations).mockResolvedValue({
      ok: true,
      data: LOCATIONS,
    });

    const { result } = renderHook(() => useProviderProfile(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(profileService.getProvider).toHaveBeenCalledWith('u-1');
    expect(result.current.data?.profile).toMatchObject({
      givenName: 'Demo',
      middleName: 'K',
      familyName: 'Doctor',
      gender: 'M',
      // Truncated to a plain date — see toDateOnly's own note on why a
      // native <input type="date"> needs exactly this, not the full ISO
      // datetime OpenMRS returns.
      birthdate: '1988-04-12',
      emailId: 'demo@example.com',
      phoneNumber: '',
    });
    expect(result.current.data?.providerUuid).toBe('p-1');
    expect(result.current.data?.personUuid).toBe('per-1');
    expect(result.current.data?.preferredNameUuid).toBe('name-1');
    expect(result.current.data?.facilities).toEqual(LOCATIONS);
    expect(result.current.data?.attributeTypeUuidByField.emailId).toBe(
      'type-emailId'
    );
    // The voided attribute must not win over the non-voided one.
    expect(result.current.data?.existingAttributeUuidByField.emailId).toBe(
      'attr-email'
    );
  });

  it('surfaces the provider fetch error instead of throwing', async () => {
    const { ApiError } = await import('@ezazi/api-client');
    vi.mocked(profileService.getProvider).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'provider not found'),
    });
    vi.mocked(profileService.getProviderAttributeTypes).mockResolvedValue({
      ok: true,
      data: ATTRIBUTE_TYPES,
    });
    vi.mocked(profileService.getLoginLocations).mockResolvedValue({
      ok: true,
      data: LOCATIONS,
    });

    const { result } = renderHook(() => useProviderProfile(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('provider not found');
  });

  it('surfaces the attribute-types fetch error instead of throwing', async () => {
    const { ApiError } = await import('@ezazi/api-client');
    vi.mocked(profileService.getProvider).mockResolvedValue({
      ok: true,
      data: PROVIDER,
    });
    vi.mocked(profileService.getProviderAttributeTypes).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'attribute types unavailable'),
    });
    vi.mocked(profileService.getLoginLocations).mockResolvedValue({
      ok: true,
      data: LOCATIONS,
    });

    const { result } = renderHook(() => useProviderProfile(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('attribute types unavailable');
  });

  it('surfaces the locations fetch error instead of throwing', async () => {
    const { ApiError } = await import('@ezazi/api-client');
    vi.mocked(profileService.getProvider).mockResolvedValue({
      ok: true,
      data: PROVIDER,
    });
    vi.mocked(profileService.getProviderAttributeTypes).mockResolvedValue({
      ok: true,
      data: ATTRIBUTE_TYPES,
    });
    vi.mocked(profileService.getLoginLocations).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'locations unavailable'),
    });

    const { result } = renderHook(() => useProviderProfile(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('locations unavailable');
  });

  it('falls back to a null preferredNameUuid when the person has no preferred name', async () => {
    vi.mocked(profileService.getProvider).mockResolvedValue({
      ok: true,
      data: {
        ...PROVIDER,
        person: { ...PROVIDER.person, preferredName: null },
      },
    });
    vi.mocked(profileService.getProviderAttributeTypes).mockResolvedValue({
      ok: true,
      data: ATTRIBUTE_TYPES,
    });
    vi.mocked(profileService.getLoginLocations).mockResolvedValue({
      ok: true,
      data: LOCATIONS,
    });

    const { result } = renderHook(() => useProviderProfile(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.preferredNameUuid).toBeNull();
    expect(result.current.data?.profile.givenName).toBe('');
  });

  it('maps gender "F" through, and any other OpenMRS value to "U"', async () => {
    vi.mocked(profileService.getProvider).mockResolvedValue({
      ok: true,
      data: { ...PROVIDER, person: { ...PROVIDER.person, gender: 'F' } },
    });
    vi.mocked(profileService.getProviderAttributeTypes).mockResolvedValue({
      ok: true,
      data: ATTRIBUTE_TYPES,
    });
    vi.mocked(profileService.getLoginLocations).mockResolvedValue({
      ok: true,
      data: LOCATIONS,
    });

    const { result } = renderHook(() => useProviderProfile(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.profile.gender).toBe('F');
  });

  it('maps an unrecognized OpenMRS gender value to "U"', async () => {
    vi.mocked(profileService.getProvider).mockResolvedValue({
      ok: true,
      data: { ...PROVIDER, person: { ...PROVIDER.person, gender: 'O' } },
    });
    vi.mocked(profileService.getProviderAttributeTypes).mockResolvedValue({
      ok: true,
      data: ATTRIBUTE_TYPES,
    });
    vi.mocked(profileService.getLoginLocations).mockResolvedValue({
      ok: true,
      data: LOCATIONS,
    });

    const { result } = renderHook(() => useProviderProfile(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.profile.gender).toBe('U');
  });

  it('leaves birthdate blank when OpenMRS returns null', async () => {
    vi.mocked(profileService.getProvider).mockResolvedValue({
      ok: true,
      data: { ...PROVIDER, person: { ...PROVIDER.person, birthdate: null } },
    });
    vi.mocked(profileService.getProviderAttributeTypes).mockResolvedValue({
      ok: true,
      data: ATTRIBUTE_TYPES,
    });
    vi.mocked(profileService.getLoginLocations).mockResolvedValue({
      ok: true,
      data: LOCATIONS,
    });

    const { result } = renderHook(() => useProviderProfile(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.profile.birthdate).toBe('');
  });

  it('rejects a fetch attempted without a signed-in user, instead of calling the API', async () => {
    vi.mocked(profileService.getProvider).mockClear();
    vi.mocked(useAppSelector).mockImplementation(selector =>
      selector({
        auth: { user: null, token: null, isAuthenticated: false },
        config: { data: null, error: null, lastFetched: null },
      })
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useProviderProfile(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      ),
    });

    /* The query is disabled without a user, so force the fetch the guard protects. */
    const query = queryClient
      .getQueryCache()
      .find({ queryKey: ['provider-profile', undefined] });
    await expect(query?.fetch()).rejects.toThrow('Not authenticated.');
    expect(result.current.fetchStatus).toBe('idle');
    expect(profileService.getProvider).not.toHaveBeenCalled();
  });
});
