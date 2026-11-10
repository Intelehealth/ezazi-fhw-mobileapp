import { eq } from 'drizzle-orm';

import { APP_STATE_ID } from '../init';
import { appState } from '../schema';
import type { DbHandle } from '../tx';

/**
 * `tbl_app_state` — one row, always `id = 1`, created by `ensureSchema`.
 * Device-local bookkeeping: never synced, no `sync` or `voided` columns.
 */

/**
 * The watermark the next pull asks the server from. It is the SERVER's clock,
 * not ours — never compare it to `Date.now()` or reformat it. The 2006 default
 * means "everything", which is what a fresh install wants.
 */
export function getPullCursor(on: DbHandle): string {
  const row = on
    .select({ cursor: appState.last_successful_pull_time })
    .from(appState)
    .where(eq(appState.id, APP_STATE_ID))
    .get();

  return row?.cursor ?? '';
}

/**
 * Writes the cursor the server just returned. MUST run inside the same
 * transaction as the rows it describes: committed on its own, a crash leaves
 * the cursor ahead of the data and those records are skipped permanently.
 */
export function setPullCursor(cursor: string, on: DbHandle): void {
  on.update(appState)
    .set({ last_successful_pull_time: cursor })
    .where(eq(appState.id, APP_STATE_ID))
    .run();
}
