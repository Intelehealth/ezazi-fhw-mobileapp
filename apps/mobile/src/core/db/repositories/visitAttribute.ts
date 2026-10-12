import { and, eq, inArray } from 'drizzle-orm';

import { VISIT_READ_STATUS_VALUE } from '../constants/literals';
import {
  PULLED_VISIT_ATTRIBUTE_TYPES,
  VISIT_HOLDER,
  VISIT_READ_STATUS,
} from '../constants/visit';
import { visitAttribute } from '../schema';
import type { VisitAttribute } from '../schema';
import { SYNC_CLEAN, SYNC_DIRTY, VOIDED_NO } from '../syncFlags';
import type { DbHandle } from '../tx';
import { newUuid } from '../uuid';

/**
 * `tbl_visit_attribute`. Identity is the (visit, type) PAIR, not the row uuid —
 * the table has no unique index on it, so every write here resolves the pair
 * explicitly. Synchronous, `on` last; see `tx.ts`.
 * The legacy carried a commented-out push call inside its update; pushing is
 * the sync seam's job. Repositories only flip the dirty flag.
 */

export type NewVisitAttribute = typeof visitAttribute.$inferInsert;

/** One row of the pull's visit-attribute list. */
export type PulledVisitAttribute = {
  uuid: string;
  visit_uuid: string;
  visit_attribute_type_uuid: string;
  value: string | null;
  voided: number;
};

/** What a pull batch did. `skipped` names the types the whitelist rejected. */
export interface PullResult {
  written: number;
  skipped: string[];
}

const forPair = (visitUuid: string, typeUuid: string) =>
  and(
    eq(visitAttribute.visit_uuid, visitUuid),
    eq(visitAttribute.visit_attribute_type_uuid, typeUuid),
  );

function findUuidsForPair(visitUuid: string, typeUuid: string, on: DbHandle): string[] {
  return on
    .select({ uuid: visitAttribute.uuid })
    .from(visitAttribute)
    .where(forPair(visitUuid, typeUuid))
    .all()
    .map((r) => r.uuid);
}

/**
 * Update the pair if it exists, insert it if not, and return the row uuid.
 * A SELECT decides which, because `DbHandle` leaves the driver's run result
 * opaque and no affected-row count is available — see `visit.closeVisit`.
 * The update deliberately hits EVERY row for the pair: without a unique index
 * duplicates are possible, and leaving one stale is worse than touching both.
 */
function writePair(
  visitUuid: string,
  typeUuid: string,
  value: string,
  sync: boolean,
  on: DbHandle,
): string {
  const existing = findUuidsForPair(visitUuid, typeUuid, on);

  if (existing.length > 0) {
    on.update(visitAttribute)
      .set({ value, voided: VOIDED_NO, sync })
      .where(forPair(visitUuid, typeUuid))
      .run();
    return existing[0];
  }

  const uuid = newUuid();
  on.insert(visitAttribute)
    .values({
      uuid,
      visit_uuid: visitUuid,
      visit_attribute_type_uuid: typeUuid,
      value,
      voided: VOIDED_NO,
      sync,
    })
    .run();

  return uuid;
}

// ── writes ────────────────────────────────────────────────────────────────

/**
 * Pull-path bulk write, matching on (visit, type) rather than the row uuid.
 * The server's uuid is NOT written over an existing local row — the legacy's
 * choice, kept because the alternative is a duplicate row per pair. It does
 * mean a local uuid can diverge from the server's; the pair is what anything
 * reads, so nothing depends on them agreeing.
 *
 * Unrecognised types are still filtered out, because only these five are ever
 * read — but they are returned in `skipped` instead of vanishing in silence.
 */
export function upsertManyFromPull(rows: PulledVisitAttribute[], on: DbHandle): PullResult {
  const allowed = new Set<string>(PULLED_VISIT_ATTRIBUTE_TYPES);
  const result: PullResult = { written: 0, skipped: [] };

  for (const row of rows) {
    if (!allowed.has(row.visit_attribute_type_uuid)) {
      result.skipped.push(row.visit_attribute_type_uuid);
      continue;
    }

    const existing = findUuidsForPair(row.visit_uuid, row.visit_attribute_type_uuid, on);

    if (existing.length > 0) {
      on.update(visitAttribute)
        .set({ value: row.value, voided: row.voided, sync: SYNC_CLEAN })
        .where(forPair(row.visit_uuid, row.visit_attribute_type_uuid))
        .run();
    } else {
      on.insert(visitAttribute)
        .values({ ...row, sync: SYNC_CLEAN })
        .onConflictDoUpdate({
          target: visitAttribute.uuid,
          set: { ...row, sync: SYNC_CLEAN },
        })
        .run();
    }

    result.written += 1;
  }

  return result;
}

/**
 * Local create, dirty. Parameter order is (visit, TYPE, value) — the legacy
 * took (visit, value, type), and getting it backwards writes four admission
 * attributes under the wrong types, which hides the patient from the Active
 * Patients list while leaving her visit open.
 */
export function insertLocal(
  visitUuid: string,
  typeUuid: string,
  value: string,
  on: DbHandle,
): string {
  const uuid = newUuid();
  on.insert(visitAttribute)
    .values({
      uuid,
      visit_uuid: visitUuid,
      visit_attribute_type_uuid: typeUuid,
      value,
      voided: VOIDED_NO,
      sync: SYNC_DIRTY,
    })
    .run();

  return uuid;
}

/**
 * The shape every local write should take: update the pair, or create it.
 * Skips the write entirely when the value already matches, so a no-op cannot
 * flip the dirty flag and schedule a pointless push — the legacy made callers
 * guard that themselves and two of the three call sites got it right.
 */
export function upsertLocal(
  visitUuid: string,
  typeUuid: string,
  value: string,
  on: DbHandle,
): string | null {
  const existing = findValue(visitUuid, typeUuid, on);
  if (existing === value) return null;

  return writePair(visitUuid, typeUuid, value, SYNC_DIRTY, on);
}

/**
 * Update-only. Returns false when the pair has no row, which the legacy could
 * not distinguish from a swallowed SQL error.
 */
export function updateValue(
  visitUuid: string,
  typeUuid: string,
  value: string,
  on: DbHandle,
): boolean {
  if (findUuidsForPair(visitUuid, typeUuid, on).length === 0) return false;

  on.update(visitAttribute)
    .set({ value, voided: VOIDED_NO, sync: SYNC_DIRTY })
    .where(forPair(visitUuid, typeUuid))
    .run();

  return true;
}

/** Hands the visit to another provider. Ownership is this attribute, not `tbl_visit.creator`. */
export function assignHolder(visitUuid: string, providerUuid: string, on: DbHandle): boolean {
  return updateValue(visitUuid, VISIT_HOLDER, providerUuid, on);
}

/**
 * Writes the read-status sentinel. The SAME value is written when the visit is
 * created, so this does not make "read" distinguishable from "new" — ported
 * verbatim because the real semantics are not knowable from the legacy.
 */
export function markRead(visitUuid: string, on: DbHandle): boolean {
  return updateValue(visitUuid, VISIT_READ_STATUS, VISIT_READ_STATUS_VALUE, on);
}

// ── reads ─────────────────────────────────────────────────────────────────

/** Live value for the pair, or null. */
export function findValue(visitUuid: string, typeUuid: string, on: DbHandle): string | null {
  const row = on
    .select({ value: visitAttribute.value })
    .from(visitAttribute)
    .where(and(forPair(visitUuid, typeUuid), eq(visitAttribute.voided, VOIDED_NO)))
    .limit(1)
    .get();

  return row?.value ?? null;
}

/** The write guard the legacy made every call site repeat. Skips voided rows. */
export function hasValue(
  visitUuid: string,
  typeUuid: string,
  value: string,
  on: DbHandle,
): boolean {
  const row = on
    .select({ uuid: visitAttribute.uuid })
    .from(visitAttribute)
    .where(
      and(
        forPair(visitUuid, typeUuid),
        eq(visitAttribute.value, value),
        eq(visitAttribute.voided, VOIDED_NO),
      ),
    )
    .limit(1)
    .get();

  return row !== undefined;
}

export function listByVisit(visitUuid: string, on: DbHandle): VisitAttribute[] {
  return on
    .select()
    .from(visitAttribute)
    .where(
      and(eq(visitAttribute.visit_uuid, visitUuid), eq(visitAttribute.voided, VOIDED_NO)),
    )
    .all();
}

/**
 * Rows the server has not seen. No voided filter — a voided attribute still
 * has to reach the server. Restricted to the five pushable types.
 */
export function findDirty(on: DbHandle): VisitAttribute[] {
  return on
    .select()
    .from(visitAttribute)
    .where(
      and(
        eq(visitAttribute.sync, SYNC_DIRTY),
        inArray(visitAttribute.visit_attribute_type_uuid, [...PULLED_VISIT_ATTRIBUTE_TYPES]),
      ),
    )
    .all();
}
