import { ApiError } from '@ezazi/api-client';
import { useProviderProfile } from './useProviderProfile';
import { useVisitList, type VisitListState } from './useVisitList';
import { useAppSelector } from '../../store/hooks';
import type { CaseSectionKey } from '../../modules/dashboard/dashboard.types';
import type { OpenMrsLocation } from '../../types/profile.types';

export type FacilityResolution =
  /* No facility set on the profile — load every facility, as Angular does. */
  | { status: 'none' }
  | { status: 'resolved'; uuid: string }
  /* A facility is set but matches no login location — nothing can be loaded safely. */
  | { status: 'unknown'; name: string };

/**
 * Turns the provider's `facility_name` attribute into the location uuid the
 * portal filters on. The profile screens save the location's display name
 * (their dropdown offers `facility.display`), while older records saved by
 * the Angular app hold the uuid itself — both are accepted.
 */
export function resolveFacility(
  facilityName: string,
  facilities: OpenMrsLocation[]
): FacilityResolution {
  const value = facilityName.trim();
  if (!value) return { status: 'none' };

  const byUuid = facilities.find(facility => facility.uuid === value);
  if (byUuid) return { status: 'resolved', uuid: byUuid.uuid };

  const byName = facilities.find(
    facility => facility.display.trim().toLowerCase() === value.toLowerCase()
  );
  return byName
    ? { status: 'resolved', uuid: byName.uuid }
    : { status: 'unknown', name: value };
}

/**
 * The three dashboard sections' visit lists, scoped to the signed-in
 * provider's facility — ports dashboard.component.ts's ngOnInit, which reads
 * the facility from the provider's `facility_name` attribute before loading
 * any visits.
 *
 * The lists wait for the provider profile, so a doctor never briefly sees
 * every facility's cases. If the profile fails to load, or names a facility
 * that no longer exists, every section reports it instead of loading, and
 * Retry reloads the profile (the lists follow).
 */
export function useDashboardVisits(): Record<CaseSectionKey, VisitListState> {
  const viewerUuid = useAppSelector(state => state.auth.user?.uuid);
  const profile = useProviderProfile();

  const facility: FacilityResolution | null = profile.data
    ? resolveFacility(
        profile.data.profile.facilityName,
        profile.data.facilities
      )
    : null;

  const options = {
    facilityUuid: facility?.status === 'resolved' ? facility.uuid : undefined,
    viewerUuid,
    enabled: profile.isSuccess && facility?.status !== 'unknown',
  };

  const lists: Record<CaseSectionKey, VisitListState> = {
    priority: useVisitList('priority', options),
    'in-progress': useVisitList('in-progress', options),
    completed: useVisitList('completed', options),
  };

  let blockingError: ApiError | null = null;
  if (profile.isError) {
    blockingError = profile.error;
  } else if (facility?.status === 'unknown') {
    blockingError = new ApiError(
      'api',
      `Your facility "${facility.name}" could not be found. Please select your facility again in your profile.`,
      { code: 'FACILITY_NOT_FOUND' }
    );
  }
  if (!blockingError) return lists;

  const failure = {
    isLoading: false,
    error: blockingError,
    retry: () => void profile.refetch(),
  };
  return {
    priority: { ...lists.priority, ...failure },
    'in-progress': { ...lists['in-progress'], ...failure },
    completed: { ...lists.completed, ...failure },
  };
}
