import { eq } from 'drizzle-orm';

import { localIsoTimestamp } from '@/core/utils/datetime';

import { location } from '../schema';
import type { Location } from '../schema';
import { SYNC_CLEAN } from '../syncFlags';
import type { DbHandle } from '../tx';

/**
 * `tbl_location`. WRITE-ONLY in the app as it stands: the pull fills it and
 * nothing reads it — a repo-wide grep over the legacy finds only the write.
 * Kept for schema and sync parity. The reads below exist so the write is
 * testable and so a future consumer has somewhere to start.
 * Note the primary key is `locationuuid`, not `uuid`.
 */

export type NewLocation = typeof location.$inferInsert;

// ── writes ────────────────────────────────────────────────────────────────

/**
 * Pull-path bulk write, keyed on `locationuuid`. `modified_date` is stamped
 * when WE write the row, matching the legacy and the rest of this layer: the
 * server's timestamp says nothing about when this device learned of the
 * change, and `locationlist` carries no modified date on the wire anyway.
 * One legacy detail IS fixed: `sync` was written as the string 'TRUE' against
 * a column defaulting to 'false'. Here it is a boolean, always clean —
 * nothing pushes locations.
 */
export function replaceAllFromPull(rows: NewLocation[], on: DbHandle): void {
  for (const row of rows) {
    const values = { ...row, modified_date: localIsoTimestamp(), sync: SYNC_CLEAN };
    on.insert(location)
      .values(values)
      .onConflictDoUpdate({ target: location.locationuuid, set: values })
      .run();
  }
}

// ── reads ─────────────────────────────────────────────────────────────────

export function findByUuid(locationUuid: string, on: DbHandle): Location | null {
  return (
    on.select().from(location).where(eq(location.locationuuid, locationUuid)).get() ?? null
  );
}

/** Ordered by name — the legacy had no list read at all, so nothing depends on another order. */
export function findAll(on: DbHandle): Location[] {
  return on.select().from(location).orderBy(location.name).all();
}
