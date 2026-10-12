import { and, desc, eq, isNotNull, ne, notInArray } from 'drizzle-orm';

import { utcIsoTimestamp } from '@/core/utils/datetime';

import {
  DELIVERY_OUTCOME_STAGE3,
  ENCOUNTER_ADMISSION,
  ENCOUNTER_VISIT_COMPLETE,
  LCG_SOS,
  NON_CLINICAL_ENCOUNTER_TYPES,
  STAGE3_HOUR1_1,
} from '../constants/encounter';
import { encounter, uuidDictionary } from '../schema';
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
 * One row, reusing an existing encounter of the same type on the same visit.
 * The legacy looked the existing row up by (visit, type) but then UPDATEd by
 * the INCOMING uuid — so when they differed the update matched nothing and the
 * encounter was silently dropped. This updates the uuid the lookup returned.
 */
function writeOne(row: NewEncounter, on: DbHandle): void {
  const values = { ...row, modified_date: utcIsoTimestamp() };
  const type = values.encounter_type_uuid;

  // SOS is never deduped: a visit may carry many.
  if (type && type !== LCG_SOS && values.visituuid) {
    const existing = findUuidForDedupe(values.visituuid, type, on);
    if (existing) {
      on.update(encounter)
        .set({ ...values, uuid: existing })
        .where(eq(encounter.uuid, existing))
        .run();
      return;
    }
  }

  on.insert(encounter)
    .values(values)
    .onConflictDoUpdate({ target: encounter.uuid, set: values })
    .run();
}

// ── writes ────────────────────────────────────────────────────────────────

/** Pull-path bulk write, one transaction's worth of rows. */
export function upsertMany(rows: NewEncounter[], on: DbHandle): void {
  for (const row of rows) writeOne({ ...row, sync: SYNC_CLEAN }, on);
}

/** The most-used write in the app. Dedupes by (visit, type). */
export function upsert(row: NewEncounter, on: DbHandle): void {
  writeOne(row, on);
}

/**
 * Bulk write with NO dedupe — always replaces by uuid. Semantically different
 * from `upsertMany`; the legacy opened a transaction per row, which was a
 * performance bug rather than a requirement.
 */
export function insertManyReplacing(rows: NewEncounter[], on: DbHandle): void {
  for (const row of rows) {
    const values = { ...row, modified_date: utcIsoTimestamp() };
    on.insert(encounter)
      .values(values)
      .onConflictDoUpdate({ target: encounter.uuid, set: values })
      .run();
  }
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
  writeOne(
    {
      uuid: input.uuid,
      visituuid: input.visitUuid,
      provider_uuid: input.providerUuid,
      encounter_time: input.encounterTime,
      encounter_type_uuid: ENCOUNTER_ADMISSION,
      voided: VOIDED_NO,
      sync: SYNC_DIRTY,
    },
    on,
  );
}

/** Marks the visit complete. The legacy minted the uuid and backdated the time here; both move out. */
export function insertVisitComplete(
  input: { uuid: string; visitUuid: string; providerUuid: string; encounterTime: string },
  on: DbHandle,
): void {
  writeOne(
    {
      uuid: input.uuid,
      visituuid: input.visitUuid,
      provider_uuid: input.providerUuid,
      encounter_time: input.encounterTime,
      encounter_type_uuid: ENCOUNTER_VISIT_COMPLETE,
      voided: VOIDED_NO,
      sync: SYNC_DIRTY,
    },
    on,
  );
}

/** Never deduped — a visit may carry many SOS encounters, by design. */
export function insertSos(row: NewEncounter, on: DbHandle): void {
  const values = { ...row, encounter_type_uuid: LCG_SOS, modified_date: utcIsoTimestamp() };
  on.insert(encounter)
    .values(values)
    .onConflictDoUpdate({ target: encounter.uuid, set: values })
    .run();
}

export function insertDeliveryOutcomeStage3(
  row: Omit<NewEncounter, 'encounter_type_uuid'>,
  on: DbHandle,
): void {
  writeOne({ ...row, encounter_type_uuid: DELIVERY_OUTCOME_STAGE3 }, on);
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
 * The current stage NAME, via `tbl_uuid_dictionary`.
 *
 * TWO THINGS TO KNOW. The ORDER BY is a LEXICOGRAPHIC sort on names, so
 * 'Stage2_Hr9_1' outranks 'Stage2_Hr10_1' — ported verbatim because changing it
 * changes app behaviour. And this is one of the dictionary joins the staged
 * removal must restructure; see ROADMAP "Staged removal".
 */
export function findCurrentStageName(visitUuid: string, on: DbHandle): string | null {
  const row = on
    .select({ name: uuidDictionary.name })
    .from(encounter)
    .innerJoin(uuidDictionary, eq(uuidDictionary.uuid, encounter.encounter_type_uuid))
    .where(and(eq(encounter.visituuid, visitUuid), eq(encounter.voided, VOIDED_NO)))
    .orderBy(desc(uuidDictionary.name))
    .limit(1)
    .get();

  return row?.name ?? null;
}

/**
 * The latest encounter's type NAME. No voided filter and no SOS exclusion, so
 * an SOS encounter can be returned as latest — the legacy behaviour.
 * Also a dictionary join; see `findCurrentStageName`.
 */
export function findLatestEncounterTypeName(
  visitUuid: string,
  on: DbHandle,
): string | null {
  const row = on
    .select({ name: uuidDictionary.name })
    .from(encounter)
    .innerJoin(uuidDictionary, eq(uuidDictionary.uuid, encounter.encounter_type_uuid))
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
    .limit(1)
    .get();

  return row?.name ?? null;
}

/**
 * One encounter type's NAME, by its uuid. The name is not a label — it is a
 * structured code (`Stage1_Hour1_1`) that callers split to get the stage and
 * hour numbers, or match with `contains('Stage1')`. Four live legacy call
 * sites parse it this way; a fifth is commented out.
 * Reads `tbl_uuid_dictionary`, so it depends on the seed; see the two
 * stage-name reads above for the same caveat.
 */
export function findTypeNameByUuid(typeUuid: string, on: DbHandle): string | null {
  const row = on
    .select({ name: uuidDictionary.name })
    .from(uuidDictionary)
    .where(eq(uuidDictionary.uuid, typeUuid))
    .limit(1)
    .get();

  return row?.name ?? null;
}
