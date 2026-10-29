import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { ApiError } from '@ezazi/api-client';
import { getOpenMrsBaseUrl } from '../../services/http';
import { visitService } from '../../services/visit.service';
import { mapVisitToRow } from '../../modules/dashboard/visit-row.mapper';
import type {
  CaseSectionKey,
  VisitRow,
} from '../../modules/dashboard/dashboard.types';
import type { VisitListResponse } from '../../types/visit.types';

/**
 * Visits fetched per request — the Angular dashboard's
 * `environment.recordsPerPage`. Each section shows 5 rows a page and asks for
 * the next 50 only once the person pages past what is already loaded.
 */
export const VISITS_PER_REQUEST = 50;

/* Failures worth retrying automatically; a 4xx or an expired session is not. */
const RETRYABLE_KINDS = new Set(['network', 'timeout', 'server']);
const MAX_RETRIES = 2;

export interface VisitListOptions {
  /** Only this facility's visits; undefined = every facility. */
  facilityUuid?: string;
  /** The signed-in user's uuid, for the seen/unseen row highlight. */
  viewerUuid?: string;
  /** False until the inputs above are known — nothing is fetched before then. */
  enabled: boolean;
}

/** Everything a case section needs to render one list, loading and failure states included. */
export interface VisitListState {
  rows: VisitRow[];
  /** Visits in the whole section on the server, not just the ones loaded. */
  totalCount: number;
  /** No rows yet and the first page is still on its way. */
  isLoading: boolean;
  /** The first page (or a full refresh) failed. */
  error: ApiError | null;
  retry: () => void;
  /** More rows exist on the server than are loaded. */
  hasMore: boolean;
  isLoadingMore: boolean;
  /** Loading a further page failed; the rows already loaded are kept. */
  loadMoreError: ApiError | null;
  loadMore: () => void;
}

/**
 * One dashboard section's visits — ports dashboard.component.ts's
 * getPriorityVisits / getInProgressVisits / getCompletedVisits paging: pages
 * of VISITS_PER_REQUEST are accumulated and paged through 5 at a time on the
 * client, and the next page is only requested when it is needed.
 */
export function useVisitList(
  section: CaseSectionKey,
  { facilityUuid, viewerUuid, enabled }: VisitListOptions
): VisitListState {
  const query = useInfiniteQuery<
    VisitListResponse,
    ApiError,
    VisitListResponse[],
    readonly unknown[],
    number
  >({
    queryKey: ['visits', section, facilityUuid ?? null],
    enabled,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const result = await visitService.getVisits(section, {
        page: pageParam,
        limit: VISITS_PER_REQUEST,
        facilityUuid,
      });
      if (!result.ok) throw result.error;
      return result.data;
    },
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0);
      /* An empty page means the list shrank under us — stop rather than loop. */
      return lastPage.data.length > 0 && loaded < lastPage.totalCount
        ? lastPageParam + 1
        : undefined;
    },
    select: data => data.pages,
    retry: (failureCount, error) =>
      failureCount < MAX_RETRIES && RETRYABLE_KINDS.has(error.kind),
  });

  const pages = query.data;

  const rows = useMemo(() => {
    if (!pages) return [];
    const context = { viewerUuid, openMrsBaseUrl: getOpenMrsBaseUrl() };
    /*
     * A visit created between two page requests shifts the server's offsets,
     * so the next page can repeat a visit already loaded — keep the first.
     */
    const seen = new Set<string>();
    const result: VisitRow[] = [];
    for (const visit of pages.flatMap(page => page.data)) {
      if (seen.has(visit.uuid)) continue;
      seen.add(visit.uuid);
      result.push(mapVisitToRow(visit, context));
    }
    return result;
  }, [pages, viewerUuid]);

  const { fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = query;

  return {
    rows,
    totalCount: pages?.[pages.length - 1]?.totalCount ?? 0,
    isLoading: query.isPending,
    error: query.isFetchNextPageError ? null : query.error,
    retry: () => void refetch(),
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    loadMoreError: query.isFetchNextPageError ? query.error : null,
    loadMore: () => {
      if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
  };
}
