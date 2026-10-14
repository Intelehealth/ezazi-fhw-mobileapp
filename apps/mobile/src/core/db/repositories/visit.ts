import { and, desc, eq, exists, isNull, notExists, or, sql } from 'drizzle-orm';

import { localIsoTimestamp } from '@/core/utils/datetime';

import { ENCOUNTER_VISIT_COMPLETE } from '../constants/encounter';
import { VISIT_HOLDER } from '../constants/visit';
import { encounter, visit, visitAttribute } from '../schema';
import type { Visit } from '../schema';
import { SYNC_CLEAN, SYNC_DIRTY, VOIDED_NO } from '../syncFlags';
import type { DbHandle } from '../tx';

/**
 * `tbl_visit`. Attribute rows belong to the `visitAttribute` repository, not
 * here, even though two predicates below read them. Synchronous, `on` last —
 * see `tx.ts`. Returns rows, never push-payload shapes.
 */

export type NewVisit = typeof visit.$inferInsert;

/**
 * Open means all three: no end date, not voided, and no completion encounter.
 * One helper because the legacy spelt this predicate three different ways and
 * they disagreed — the same visit could be a patient's active visit and absent
 * from the active list.
 */
function isOpen(on: DbHandle) {
  return and(
    // Pulled rows can carry '' where local writes use NULL; both mean open.
    or(isNull(visit.enddate), eq(visit.enddate, '')),
    eq(visit.voided, VOIDED_NO),
    notExists(
      on
        .select({ one: sql`1` })
        .from(encounter)
        .where(
          and(
            eq(encounter.visituuid, visit.uuid),
            eq(encounter.encounter_type_uuid, ENCOUNTER_VISIT_COMPLETE),
            eq(encounter.voided, VOIDED_NO),
          ),
        ),
    ),
  );
}

/**
 * Ownership is the VISIT_HOLDER attribute, never `tbl_visit.creator`, which is
 * immutable — a shift handover moves a visit by updating this attribute.
 * The legacy omitted the type filter, so ANY attribute whose value matched the
 * provider uuid granted access. That was an authorisation hole, not a list bug.
 */
function heldBy(on: DbHandle, providerId: string) {
  return exists(
    on
      .select({ one: sql`1` })
      .from(visitAttribute)
      .where(
        and(
          eq(visitAttribute.visit_uuid, visit.uuid),
          eq(visitAttribute.visit_attribute_type_uuid, VISIT_HOLDER),
          eq(visitAttribute.value, providerId),
        ),
      ),
  );
}

// ── writes ────────────────────────────────────────────────────────────────

/**
 * Pull-path bulk write. Explicit column set, so `voided` and `issubmitted`
 * survive: the legacy replaced the whole row and silently un-voided a visit
 * the server had voided, on every re-sync.
 */
export function upsertManyFromServer(visits: NewVisit[], on: DbHandle): void {
  for (const row of visits) {
    const values = { ...row, sync: SYNC_CLEAN };
    on.insert(visit)
      .values(values)
      .onConflictDoUpdate({ target: visit.uuid, set: values })
      .run();
  }
}

/**
 * Local create. Plain insert, so a duplicate uuid throws rather than silently
 * replacing. Writes the visit row only — attributes are their own call.
 */
export function create(row: NewVisit, on: DbHandle): void {
  on.insert(visit)
    .values({ ...row, modified_date: localIsoTimestamp(), sync: SYNC_DIRTY })
    .run();
}

/** Marks a visit as needing a push. Every server-visible change must call this. */
export function markDirty(uuid: string, on: DbHandle): void {
  on.update(visit).set({ sync: SYNC_DIRTY }).where(eq(visit.uuid, uuid)).run();
}

/** Clears the flag after the server has acknowledged the push. */
export function markSynced(uuid: string, on: DbHandle): void {
  on.update(visit).set({ sync: SYNC_CLEAN }).where(eq(visit.uuid, uuid)).run();
}

/**
 * Closes a visit, flagging it dirty in the SAME statement — the one legacy
 * convention worth keeping verbatim, since a change that misses the flag never
 * reaches the server. Throws on a blank date; the legacy reported success and
 * did nothing.
 *
 * Returns void: `DbHandle` leaves the driver's run result opaque so expo-sqlite
 * and sql.js both fit, so no row count is available. Check the visit exists first.
 */
export function closeVisit(uuid: string, endDate: string, on: DbHandle): void {
  if (!endDate) throw new Error('closeVisit requires an end date');

  on.update(visit)
    .set({ enddate: endDate, sync: SYNC_DIRTY })
    .where(eq(visit.uuid, uuid))
    .run();
}

// ── reads ─────────────────────────────────────────────────────────────────

/**
 * Visits the server has not seen, each with its attribute rows. One query via
 * the declared relation, not the legacy's extra lookup per visit.
 * No voided filter: voided visits are pushed too.
 *
 * `.sync()` is required — on a sync driver `findMany` returns the query, and
 * only awaiting or calling sync() runs it.
 */
export function findDirty(on: DbHandle) {
  return on.query.visit
    .findMany({ where: eq(visit.sync, SYNC_DIRTY), with: { attributes: true } })
    .sync();
}

/** Explicit ordering — none of the legacy list reads had any. */
export function findAll(on: DbHandle): Visit[] {
  return on.select().from(visit).orderBy(desc(visit.startdate)).all();
}

/**
 * The 'is this woman currently admitted' query. Most recent open visit, or
 * null. Replaces `fetchVisitUUIDFromPatientUUID`, which had no ordering and
 * returned closed and voided visits — do not reinstate it.
 */
export function findActiveVisitUuid(patientUuid: string, on: DbHandle): string | null {
  const row = on
    .select({ uuid: visit.uuid })
    .from(visit)
    .where(and(eq(visit.patientuuid, patientUuid), isOpen(on)))
    .orderBy(desc(visit.startdate))
    .limit(1)
    .get();

  return row?.uuid ?? null;
}

export function findPatientUuidByVisit(visitUuid: string, on: DbHandle): string | null {
  const row = on
    .select({ patientuuid: visit.patientuuid })
    .from(visit)
    .where(eq(visit.uuid, visitUuid))
    .get();

  return row?.patientuuid ?? null;
}

/** Drives the Active Patients screen. */
export function findActiveVisitsByProvider(providerId: string, on: DbHandle): Visit[] {
  return on
    .select()
    .from(visit)
    .where(and(isOpen(on), heldBy(on, providerId)))
    .orderBy(desc(visit.startdate))
    .all();
}

/** Gates edit access in the timeline. Ownership only — says nothing about open. */
export function hasProviderAccess(
  visitUuid: string,
  providerId: string,
  on: DbHandle,
): boolean {
  const row = on
    .select({ uuid: visit.uuid })
    .from(visit)
    .where(and(eq(visit.uuid, visitUuid), heldBy(on, providerId)))
    .get();

  return row !== undefined;
}

/** The single-visit form of `findActiveVisitsByProvider`, sharing its predicates. */
export function isVisitActive(
  visitUuid: string,
  providerId: string,
  on: DbHandle,
): boolean {
  const row = on
    .select({ uuid: visit.uuid })
    .from(visit)
    .where(and(eq(visit.uuid, visitUuid), isOpen(on), heldBy(on, providerId)))
    .get();

  return row !== undefined;
}
