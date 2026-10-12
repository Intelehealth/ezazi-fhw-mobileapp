import { eq } from 'drizzle-orm';

import { rtcConnectionLog } from '../schema';
import type { RtcConnectionLog } from '../schema';
import type { DbHandle } from '../tx';

/**
 * `tbl_rtc_connection_log`. Device-local call telemetry: it has NO `sync` and
 * NO `voided` column, is never pushed and never pulled, and must be excluded
 * from any "iterate every table and push the dirty rows" loop in the sync
 * engine. The only table in `core/db` that is not server-backed.
 */

export type NewRtcConnectionLog = typeof rtcConnectionLog.$inferInsert;

/**
 * First write per visit wins; later ones are discarded and report false.
 *
 * Ported as-is, but flagged: for a table named `_log` this looks accidental
 * rather than intended, and the legacy could not even enforce it — its guard
 * and its insert ran on two different handles, one of which it closed in
 * between, so the check raced. Here they share one handle and SQLite has a
 * single writer, so the guard actually holds. If appending every connection is
 * what was wanted, this is the one line to change. See ROADMAP.
 */
export function insertIfAbsent(row: NewRtcConnectionLog, on: DbHandle): boolean {
  if (row.visit_uuid && findByVisitUuid(row.visit_uuid, on) !== null) return false;

  on.insert(rtcConnectionLog)
    .values(row)
    .onConflictDoUpdate({ target: rtcConnectionLog.uuid, set: row })
    .run();

  return true;
}

/**
 * The guard above keeps at most one row per visit, so `limit 1` and the
 * legacy's "last row of the cursor wins" are the same answer.
 */
export function findByVisitUuid(visitUuid: string, on: DbHandle): RtcConnectionLog | null {
  return (
    on
      .select()
      .from(rtcConnectionLog)
      .where(eq(rtcConnectionLog.visit_uuid, visitUuid))
      .limit(1)
      .get() ?? null
  );
}
