import { vi } from 'vitest';
import type { VisitListState } from '../../hooks/queries/useVisitList';
import type {
  CaseSectionKey,
  VisitRow,
} from '../../modules/dashboard/dashboard.types';

/** A dashboard row with every field filled; override what a test cares about. */
export function buildVisitRow(overrides: Partial<VisitRow> = {}): VisitRow {
  return {
    uuid: 'visit-1',
    patient: {
      name: 'Asha Devi',
      identifier: 'ELCG-1042',
      gender: 'F',
      age: 27,
    },
    stage: 2,
    alertCount: 3,
    cervixPlotX: '6',
    descentPlotO: '2',
    alarmingReadings: [],
    provider: 'Kavita Rao',
    isUnseen: false,
    inLabourDuration: '2026/10/22 09:15 am',
    ...overrides,
  };
}

/** A settled, successful section with `rows`; override to put it in another state. */
export function buildVisitListState(
  overrides: Partial<VisitListState> = {}
): VisitListState {
  const rows = overrides.rows ?? [];
  return {
    rows,
    totalCount: rows.length,
    isLoading: false,
    error: null,
    retry: vi.fn(),
    hasMore: false,
    isLoadingMore: false,
    loadMoreError: null,
    loadMore: vi.fn(),
    ...overrides,
  };
}

/** All three sections in the same state — e.g. still loading, for screens that only check layout. */
export function buildDashboardVisits(
  overrides: Partial<Record<CaseSectionKey, VisitListState>> = {}
): Record<CaseSectionKey, VisitListState> {
  return {
    priority: buildVisitListState(),
    'in-progress': buildVisitListState(),
    completed: buildVisitListState(),
    ...overrides,
  };
}
