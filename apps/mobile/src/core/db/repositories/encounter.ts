import { and, desc, eq, isNotNull, ne, notInArray } from 'drizzle-orm';

import { utcIsoTimestamp } from '@/core/utils/datetime';

import {
  DELIVERY_OUTCOME_STAGE3,
  ENCOUNTER_ADMISSION,
  ENCOUNTER_VISIT_COMPLETE,
  encounterTypeName,
  LCG_SOS,
  NON_CLINICAL_ENCOUNTER_TYPES,
  STAGE3_HOUR1_1,
} from '../constants/encounter';
import { encounter } from '../schema';
import type { Encounter } from '../schema';
import { SYNC_CLEAN, SYNC_DIRTY, VOIDED_NO } from '../syncFlags';
import type { DbHandle } from '../tx';

/**
 * `tbl_encounter`. Type uuids come from `constants/encounter`, never from a
 * name lookup. Synchronous, `on` last — see `tx.ts`. Returns rows, never
 * push-payload shapes.
 * Timestamps are UTC here and local on patient/visit; that split is the
 * legacy's, preserved because both reach the server.
 */

export type NewEncounter = typeof encounter.$inferInsert;

/** A typeless encounter cannot be pushed, so it must not occupy a queue slot. */
const hasType = () => and(isNotNull(encounter.encounter_type_uuid), ne(encounter.encounter_type_uuid, ''));

/**
 * Dedupe lookup. Deliberately has NO voided filter, unlike
 * `findUuidByVisitAndType` — a voided encounter of that type still counts as
 * present, which is the legacy behaviour at both write sites.
 */
function findUuidForDedupe(visitUuid: string, typeUuid: string, on: DbHandle): string | null {
  const row = on
    .select({ uuid: encounter.uuid })
    .from(encounter)
    .where(and(eq(encounter.visituuid, visitUuid), eq(encounter.encounter_type_uuid, typeUuid)))
    .limit(1)
    .get();

  return row?.uuid ?? null;
}

/**
 * Pull-path write. The server's uuid IS the identity, so there is no dedupe
 * by (visit, type) here: re-keying a pulled row to a local uuid destroys the
 * key the push ack matches on, and the row is never confirmed.
 */
function writeFromServer(row: NewEncounter, on: DbHandle): void {
  const values = { ...row, modified_date: utcIsoTimestamp(), sync: SYNC_CLEAN };

  on.insert(encounter)
    .values(values)
    .onConflictDoUpdate({ target: encounter.uuid, set: values })
    .run();
}

/**
 * Local write. Dedupes by (visit, type) and ADOPTS the uuid it finds rather
 * than renaming the row — so a pulled encounter keeps the server's uuid.
 * Always re-arms the dirty flag, or an edit to a pushed row never goes again.
 */
function writeLocal(row: NewEncounter, on: DbHandle): void {
  const type = row.encounter_type_uuid;

  // SOS is never deduped: a visit may carry many.
  const uuid =
    type && type !== LCG_SOS && row.visituuid
      ? (findUuidForDedupe(row.visituuid, type, on) ?? row.uuid)
      : row.uuid;

  const values = { ...row, uuid, modified_date: utcIsoTimestamp(), sync: SYNC_DIRTY };

  on.insert(encounter)
    .values(values)
    .onConflictDoUpdate({ target: encounter.uuid, set: values })
    .run();
}

// ── writes ────────────────────────────────────────────────────────────────

/** Pull-path bulk write, one transaction's worth of rows. */
export function upsertMany(rows: NewEncounter[], on: DbHandle): void {
  for (const row of rows) writeFromServer(row, on);
}

/** The most-used write in the app. Dedupes by (visit, type), never re-keys. */
export function upsert(row: NewEncounter, on: DbHandle): void {
  writeLocal(row, on);
}

export function markDirty(uuid: string, on: DbHandle): void {
  on.update(encounter).set({ sync: SYNC_DIRTY }).where(eq(encounter.uuid, uuid)).run();
}

export function markSynced(uuid: string, on: DbHandle): void {
  on.update(encounter).set({ sync: SYNC_CLEAN }).where(eq(encounter.uuid, uuid)).run();
}

/**
 * Creates the Admission encounter the 15 admission obs hang off.
 * Caller supplies the uuid and time so this stays data-only.
 */
export function insertAdmission(
  input: { uuid: string; visitUuid: string; providerUuid: string; encounterTime: string },
  on: DbHandle,
): void {
  writeLocal(
    {
      uuid: input.uuid,
      visituuid: input.visitUuid,
      provider_uuid: input.providerUuid,
      encounter_time: input.encounterTime,
      encounter_type_uuid: ENCOUNTER_ADMISSION,
      voided: VOIDED_NO,
    },
    on,
  );
}

/** Marks the visit complete. The legacy minted the uuid and backdated the time here; both move out. */
export function insertVisitComplete(
  input: { uuid: string; visitUuid: string; providerUuid: string; encounterTime: string },
  on: DbHandle,
): void {
  writeLocal(
    {
      uuid: input.uuid,
      visituuid: input.visitUuid,
      provider_uuid: input.providerUuid,
      encounter_time: input.encounterTime,
      encounter_type_uuid: ENCOUNTER_VISIT_COMPLETE,
      voided: VOIDED_NO,
    },
    on,
  );
}

/** Never deduped — a visit may carry many SOS encounters, by design. */
export function insertSos(row: NewEncounter, on: DbHandle): void {
  writeLocal({ ...row, encounter_type_uuid: LCG_SOS }, on);
}

export function insertDeliveryOutcomeStage3(
  row: Omit<NewEncounter, 'encounter_type_uuid'>,
  on: DbHandle,
): void {
  writeLocal({ ...row, encounter_type_uuid: DELIVERY_OUTCOME_STAGE3 }, on);
}

// ── reads ─────────────────────────────────────────────────────────────────

/** No voided filter — see `findUuidForDedupe`. */
export function existsByVisitAndType(
  visitUuid: string,
  typeUuid: string,
  on: DbHandle,
): boolean {
  return findUuidForDedupe(visitUuid, typeUuid, on) !== null;
}

/** The 'reuse the existing encounter, never re-key it' lookup. Skips voided rows. */
export function findUuidByVisitAndType(
  visitUuid: string,
  typeUuid: string,
  on: DbHandle,
): string | null {
  const row = on
    .select({ uuid: encounter.uuid })
    .from(encounter)
    .where(
      and(
        eq(encounter.visituuid, visitUuid),
        eq(encounter.encounter_type_uuid, typeUuid),
        eq(encounter.voided, VOIDED_NO),
      ),
    )
    .limit(1)
    .get();

  return row?.uuid ?? null;
}

/** Rows the server has not seen. Typeless encounters are excluded deliberately. */
export function findUnsynced(on: DbHandle): Encounter[] {
  return on
    .select()
    .from(encounter)
    .where(and(eq(encounter.sync, SYNC_DIRTY), hasType()))
    .all();
}

export function findAll(on: DbHandle): Encounter[] {
  return on.select().from(encounter).orderBy(desc(encounter.encounter_time)).all();
}

/** The visit timeline, ascending, with the bookkeeping encounters filtered out. */
export function findTimelineByVisit(visitUuid: string, on: DbHandle): Encounter[] {
  return on
    .select()
    .from(encounter)
    .where(
      and(
        eq(encounter.visituuid, visitUuid),
        eq(encounter.voided, VOIDED_NO),
        notInArray(encounter.encounter_type_uuid, [
          ENCOUNTER_VISIT_COMPLETE,
          ENCOUNTER_ADMISSION,
        ]),
      ),
    )
    .orderBy(encounter.encounter_time)
    .all();
}

/** The latest real clinical encounter. Excludes the three bookkeeping types. */
export function findLatestClinicalByVisit(
  visitUuid: string,
  on: DbHandle,
): Encounter | null {
  return (
    on
      .select()
      .from(encounter)
      .where(
        and(
          eq(encounter.visituuid, visitUuid),
          eq(encounter.voided, VOIDED_NO),
          notInArray(encounter.encounter_type_uuid, [...NON_CLINICAL_ENCOUNTER_TYPES]),
          hasType(),
        ),
      )
      .orderBy(desc(encounter.encounter_time))
      .limit(1)
      .get() ?? null
  );
}

/** Present means stage 2 has ended. No voided filter, matching the legacy. */
export function findVisitCompleteUuid(visitUuid: string, on: DbHandle): string | null {
  const row = on
    .select({ uuid: encounter.uuid })
    .from(encounter)
    .where(
      and(
        eq(encounter.visituuid, visitUuid),
        eq(encounter.encounter_type_uuid, ENCOUNTER_VISIT_COMPLETE),
      ),
    )
    .limit(1)
    .get();

  return row?.uuid ?? null;
}

/** All three columns the Home screen reads. Uses the voided IN-list, sorts newest first. */
export function findByVisit(
  visitUuid: string,
  on: DbHandle,
): Pick<Encounter, 'uuid' | 'encounter_type_uuid' | 'encounter_time'>[] {
  return on
    .select({
      uuid: encounter.uuid,
      encounter_type_uuid: encounter.encounter_type_uuid,
      encounter_time: encounter.encounter_time,
    })
    .from(encounter)
    .where(and(eq(encounter.visituuid, visitUuid), eq(encounter.voided, VOIDED_NO)))
    .orderBy(desc(encounter.encounter_time))
    .all();
}

/** The generalised form; `findLatestSosByVisit` is a named wrapper over it. */
export function findLatestByVisitAndType(
  visitUuid: string,
  typeUuid: string,
  on: DbHandle,
): Encounter | null {
  return (
    on
      .select()
      .from(encounter)
      .where(
        and(
          eq(encounter.visituuid, visitUuid),
          eq(encounter.encounter_type_uuid, typeUuid),
          eq(encounter.voided, VOIDED_NO),
        ),
      )
      .orderBy(desc(encounter.encounter_time))
      .limit(1)
      .get() ?? null
  );
}

export function findLatestSosByVisit(visitUuid: string, on: DbHandle): Encounter | null {
  return findLatestByVisitAndType(visitUuid, LCG_SOS, on);
}

export function isStage3Started(visitUuid: string, on: DbHandle): boolean {
  return findLatestByVisitAndType(visitUuid, STAGE3_HOUR1_1, on) !== null;
}

/**
 * The current stage NAME.
 *
 * THE ORDER IS A LEXICOGRAPHIC SORT ON NAMES, so 'Stage2_Hr9_1' outranks
 * 'Stage2_Hr10_1' — ported verbatim because changing it changes app behaviour.
 * The legacy INNER JOINed `tbl_uuid_dictionary`; names come from
 * `constants/encounter` now, and a type with no name is skipped exactly as an
 * unmatched join row was.
 */
export function findCurrentStageName(visitUuid: string, on: DbHandle): string | null {
  const names = on
    .select({ type: encounter.encounter_type_uuid })
    .from(encounter)
    .where(and(eq(encounter.visituuid, visitUuid), eq(encounter.voided, VOIDED_NO)))
    .all()
    .map((row) => (row.type ? encounterTypeName(row.type) : null))
    .filter((name): name is string => name !== null);

  return names.sort().at(-1) ?? null;
}

/**
 * The latest encounter's type NAME. No voided filter and no SOS exclusion, so
 * an SOS encounter can be returned as latest — the legacy behaviour.
 * The legacy's INNER JOIN dropped unnamed types BEFORE ordering, so this takes
 * the newest encounter that HAS a name rather than the newest encounter.
 */
export function findLatestEncounterTypeName(
  visitUuid: string,
  on: DbHandle,
): string | null {
  const rows = on
    .select({ type: encounter.encounter_type_uuid })
    .from(encounter)
    .where(
      and(
        eq(encounter.visituuid, visitUuid),
        notInArray(encounter.encounter_type_uuid, [
          ENCOUNTER_VISIT_COMPLETE,
          ENCOUNTER_ADMISSION,
        ]),
      ),
    )
    .orderBy(desc(encounter.encounter_time))
    .all();

  for (const row of rows) {
    const name = row.type ? encounterTypeName(row.type) : null;
    if (name !== null) return name;
  }

  return null;
}

