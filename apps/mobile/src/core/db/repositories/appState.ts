import { eq } from 'drizzle-orm';

import { APP_STATE_ID } from '../init';
import { appState, PULL_EPOCH } from '../schema';
import type { DbHandle } from '../tx';

/**
 * `tbl_app_state` — one row, always `id = 1`, created by `ensureSchema`.
 * Device-local bookkeeping: never synced, no `sync` or `voided` columns.
 */

export { PULL_EPOCH };

/**
 * The watermark the next pull asks the server from. It is the SERVER's clock,
 * not ours — never compare it to `Date.now()` or reformat it.
 *
 * Falls back to `PULL_EPOCH`, not `''`. The row is created by `ensureSchema`,
 * so it is absent only when this is called before schema init — and the
 * honest answer then is still "nothing has been pulled". Returning `''` gave
 * that state two spellings, which `hasNeverPulled` would have to know about.
 */
export function getPullCursor(on: DbHandle): string {
  const row = on
    .select({ cursor: appState.last_successful_pull_time })
    .from(appState)
    .where(eq(appState.id, APP_STATE_ID))
    .get();

  return row?.cursor ?? PULL_EPOCH;
}

/**
 * Whether the first sync still has to run. The cursor is the only marker:
 * `readArchive` moves it off the epoch as the last thing it does, inside the
 * same transaction as the rows, so a crash part-way leaves this `true` and the
 * next launch redoes the archive rather than skipping what it never applied.
 */
export function hasNeverPulled(on: DbHandle): boolean {
  return getPullCursor(on) === PULL_EPOCH;
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
