import { renderHook } from '@testing-library/react';
import { NetworkError } from '@ezazi/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resolveFacility,
  useDashboardVisits,
} from '../../../hooks/queries/useDashboardVisits';
import { useProviderProfile } from '../../../hooks/queries/useProviderProfile';
import { useVisitList } from '../../../hooks/queries/useVisitList';
import { useAppSelector } from '../../../store/hooks';
import { buildVisitListState } from '../../fixtures/visit-list';

vi.mock('../../../hooks/queries/useProviderProfile', () => ({
  useProviderProfile: vi.fn(),
}));

vi.mock('../../../hooks/queries/useVisitList', () => ({
  useVisitList: vi.fn(),
}));

/*
 * Mocked rather than a real react-redux Provider — the same dual-React
 * hoisting hazard useProviderProfile.test.tsx documents.
 */
vi.mock('../../../store/hooks', () => ({
  useAppSelector: vi.fn(),
}));

type ProfileQuery = ReturnType<typeof useProviderProfile>;

function mockProfile(query: Partial<ProfileQuery>) {
  vi.mocked(useProviderProfile).mockReturnValue(query as ProfileQuery);
}

beforeEach(() => {
  vi.mocked(useVisitList).mockReset();
  vi.mocked(useVisitList).mockReturnValue(buildVisitListState());
  vi.mocked(useAppSelector).mockImplementation(selector =>
    selector({
      auth: {
        user: {
          uuid: 'u-1',
          username: 'doctor1',
          displayName: 'Doctor',
          roles: [],
          providerUuid: 'p-1',
          personUuid: 'per-1',
        },
        token: null,
        isAuthenticated: true,
      },
      config: { data: null, error: null, lastFetched: null },
    } as Parameters<typeof selector>[0])
  );
});

const FACILITIES = [
  { uuid: 'loc-1', display: 'Maternity Hospital 1' },
  { uuid: 'loc-2', display: 'District Hospital' },
];

/* A loaded profile whose facility_name attribute holds `facilityName`. */
function loadedProfile(facilityName: string): Partial<ProfileQuery> {
  return {
    isSuccess: true,
    isError: false,
    data: {
      profile: { facilityName },
      facilities: FACILITIES,
    } as unknown as ProfileQuery['data'],
  };
}

describe('resolveFacility', () => {
  it('finds the uuid of the facility the profile names (what the profile screens save)', () => {
    expect(resolveFacility('Maternity Hospital 1', FACILITIES)).toEqual({
      status: 'resolved',
      uuid: 'loc-1',
    });
  });

  it('ignores case and surrounding spaces in the name', () => {
    expect(resolveFacility('  maternity hospital 1 ', FACILITIES)).toEqual({
      status: 'resolved',
      uuid: 'loc-1',
    });
  });

  it('accepts a uuid saved directly (older Angular-era records)', () => {
    expect(resolveFacility('loc-2', FACILITIES)).toEqual({
      status: 'resolved',
      uuid: 'loc-2',
    });
  });

  it('reports no facility for a blank value', () => {
    expect(resolveFacility('  ', FACILITIES)).toEqual({ status: 'none' });
  });

  it('reports a name that matches no login location as unknown', () => {
    expect(resolveFacility('Closed Clinic', FACILITIES)).toEqual({
      status: 'unknown',
      name: 'Closed Clinic',
    });
  });
});

describe('useDashboardVisits', () => {
  it('waits for the provider profile before loading any section', () => {
    mockProfile({ isSuccess: false, isError: false, data: undefined });

    renderHook(() => useDashboardVisits());

    expect(useVisitList).toHaveBeenCalledTimes(3);
    for (const [, options] of vi.mocked(useVisitList).mock.calls) {
      expect(options.enabled).toBe(false);
    }
  });

  it("filters every section by the facility's uuid, not its name", () => {
    mockProfile(loadedProfile('Maternity Hospital 1'));

    renderHook(() => useDashboardVisits());

    expect(
      vi.mocked(useVisitList).mock.calls.map(([section]) => section)
    ).toEqual(['priority', 'in-progress', 'completed']);
    for (const [, options] of vi.mocked(useVisitList).mock.calls) {
      expect(options).toEqual({
        facilityUuid: 'loc-1',
        viewerUuid: 'u-1',
        enabled: true,
      });
    }
  });

  it('loads every facility when the provider has no facility set', () => {
    mockProfile(loadedProfile(''));

    renderHook(() => useDashboardVisits());

    const [, options] = vi.mocked(useVisitList).mock.calls[0];
    expect(options.facilityUuid).toBeUndefined();
    expect(options.enabled).toBe(true);
  });

  it('loads nothing and explains it when the facility cannot be found', () => {
    const refetch = vi.fn();
    mockProfile({ ...loadedProfile('Closed Clinic'), refetch });

    const { result } = renderHook(() => useDashboardVisits());

    for (const [, options] of vi.mocked(useVisitList).mock.calls) {
      expect(options.enabled).toBe(false);
    }
    for (const list of Object.values(result.current)) {
      expect(list.error?.code).toBe('FACILITY_NOT_FOUND');
      expect(list.error?.message).toContain('"Closed Clinic"');
      expect(list.isLoading).toBe(false);
    }
    result.current.priority.retry();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('reports a profile failure on every section, with Retry reloading the profile', () => {
    const refetch = vi.fn();
    const error = new NetworkError();
    mockProfile({ isSuccess: false, isError: true, error, refetch });

    const { result } = renderHook(() => useDashboardVisits());

    for (const list of Object.values(result.current)) {
      expect(list.error).toBe(error);
      expect(list.isLoading).toBe(false);
    }
    result.current.completed.retry();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
