import type { DbHandle } from '@/core/db/tx';

import { applyPull, type ApplyResult, type PullPayload } from './applyPull';

/**
 * Walks a paginated pull to the end. The server answers each page with the
 * NEXT page number, or `-1` when there are no more, and every page repeats the
 * same `pullexecutedtime` — so the cursor moves exactly once, on the last page.
 */

/** The server's "no more pages" marker, and where a run starts. */
export const NO_MORE_PAGES = -1;
export const FIRST_PAGE = 0;

/** What AMC sends. Nothing measured it; no page size is right or wrong. */
export const DEFAULT_PAGE_SIZE = 1000;

/**
 * Fetches ONE page, already unwrapped from the `{ status, data }` envelope.
 * Supplied by the transport: nothing in `core/db/sync` makes a network call.
 */
export type FetchPullPage = (pageNo: number) => Promise<PullPayload>;

export interface PullRunResult extends ApplyResult {
  pages: number;
}

/**
 * Each page lands in its OWN transaction, so a failure on page 3 keeps pages 1
 * and 2. That is safe because the cursor has not moved: the next run asks from
 * the same point, every write is an upsert keyed by uuid, and it converges.
 */
export async function pullAllPages(
  fetchPage: FetchPullPage,
  on?: DbHandle,
): Promise<PullRunResult> {
  const applied: ApplyResult[] = [];
  let pageNo = FIRST_PAGE;

  for (;;) {
    // Fetched and parsed BEFORE any transaction opens — `transact` is sync.
    const page = await fetchPage(pageNo);
    const next = page.pageNo ?? NO_MORE_PAGES;
    const last = next === NO_MORE_PAGES;

    applied.push(applyPull(page, last ? (page.pullexecutedtime ?? null) : null, on));
    if (last) break;

    // A page that does not advance would loop forever. Stop loudly instead:
    // the rows are kept, the cursor has not moved, the next run redoes them.
    if (next <= pageNo) {
      throw new Error(`[sync] pull page ${pageNo} pointed back at page ${next}`);
    }

    pageNo = next;
  }

  return totalise(applied);
}

/** Sums the pages. Only the last one carries a cursor, so the last one wins. */
function totalise(pages: ApplyResult[]): PullRunResult {
  return pages.reduce<PullRunResult>(
    (total, page) => ({
      patients: total.patients + page.patients,
      patientAttributes: total.patientAttributes + page.patientAttributes,
      attributeTypes: total.attributeTypes + page.attributeTypes,
      visits: total.visits + page.visits,
      encounters: total.encounters + page.encounters,
      observations: total.observations + page.observations,
      locations: total.locations + page.locations,
      providers: total.providers + page.providers,
      providerAttributes: total.providerAttributes + page.providerAttributes,
      visitAttributes: total.visitAttributes + page.visitAttributes,
      cursor: page.cursor ?? total.cursor,
      pages: total.pages + 1,
    }),
    {
      patients: 0,
      patientAttributes: 0,
      attributeTypes: 0,
      visits: 0,
      encounters: 0,
      observations: 0,
      locations: 0,
      providers: 0,
      providerAttributes: 0,
      visitAttributes: 0,
      cursor: null,
      pages: 0,
    },
  );
}
