import { and, desc, eq, inArray, notExists, notInArray, sql } from 'drizzle-orm';

import { utcIsoTimestamp } from '@/core/utils/datetime';

import { DELIVERY_OUTCOME_STAGE3, ENCOUNTER_ADMISSION } from '../constants/encounter';
import {
  ADMISSION_CONCEPTS,
  BIRTH_OUTCOME,
  COMPLEX_IMAGE_AD,
  COMPLEX_IMAGE_PE,
  ENCOUNTER_TYPE,
  MISSED_ENCOUNTER,
  OUT_OF_TIME,
  SOS_STAGE_HOUR,
} from '../constants/obs';
import { PROVIDER_ROLE_DOCTOR } from '../constants/literals';
import { encounter, obs, provider } from '../schema';
import type { Obs } from '../schema';
import { SYNC_CLEAN, SYNC_DIRTY, VOIDED_NO, VOIDED_YES } from '../syncFlags';
import type { DbHandle } from '../tx';
import { newUuid } from '../uuid';

/**
 * `tbl_obs`. Concept uuids come from `constants/obs`, never from a name lookup.
 * Synchronous, `on` last — see `tx.ts`. Returns rows, never payload shapes.
 * Timestamps are UTC here, matching `encounter`; patient and visit are local.
 * The legacy's `voided IN ('0','false','FALSE')` filters collapse to `= 0`
 * throughout: D2 made the column INTEGER, so mixed encodings cannot exist.
 */

/** Columns a caller supplies. The repository owns sync and modified_date; uuid is optional. */
export type ObsInput = Omit<typeof obs.$inferInsert, 'uuid' | 'sync' | 'modified_date'> & {
  uuid?: string;
};

/** A full row as the server sends it, for the pull path. */
export type ObsUpsert = typeof obs.$inferInsert;

/** The edit path cannot touch `comment` — see `update`. */
export type ObsUpdate = Omit<ObsInput, 'comment' | 'uuid'>;

/** One of the 15 admission concepts, in capture order. */
export type AdmissionConcept = (typeof ADMISSION_CONCEPTS)[number];

export interface ObsComment {
  conceptuuid: string | null;
  comment: string | null;
}

/** The four columns every concept-filtered read projects. */
export interface ObsProjection {
  uuid: string;
  encounteruuid: string | null;
  conceptuuid: string | null;
  value: string | null;
  comment: string | null;
}

/** A trend-series row. `encounterTime` is a real field; the legacy aliased it onto a date column. */
export interface ObsAtEncounterTime extends ObsProjection {
  encounterTime: string | null;
}

/** Risk-score inputs, as the stage-aware query projects them. */
export interface RiskObs {
  encounteruuid: string | null;
  conceptuuid: string | null;
  value: string | null;
  comment: string | null;
}

const notVoided = eq(obs.voided, VOIDED_NO);

/**
 * Metadata obs, not clinical data. Which of these a "has this encounter been
 * filled in?" read excludes differs by read, and the difference is load-bearing.
 */
const METADATA_CONCEPTS = [ENCOUNTER_TYPE, SOS_STAGE_HOUR];

/** Non-blank after trimming. Blank `comment` means "skip" to the risk reads. */
const filled = (text: string | null) => Boolean(text?.trim());

/** Mints the uuid when the caller has none, and returns it either way. */
function writeOne(input: ObsInput, on: DbHandle): string {
  const uuid = input.uuid ?? newUuid();
  const stamp = utcIsoTimestamp();
  const values = {
    ...input,
    uuid,
    // Four legacy writers left this NULL, so every `order by created_date` read sorted arbitrarily.
    created_date: input.created_date ?? stamp,
    modified_date: stamp,
    sync: SYNC_DIRTY,
  };

  on.insert(obs).values(values).onConflictDoUpdate({ target: obs.uuid, set: values }).run();
  return uuid;
}

// ── writes ────────────────────────────────────────────────────────────────

/** Pull-path bulk write. Explicit column set on conflict, never a whole-row replace. */
export function upsertManyFromServer(rows: ObsUpsert[], on: DbHandle): void {
  for (const row of rows) {
    const values = { ...row, sync: SYNC_CLEAN };
    on.insert(obs).values(values).onConflictDoUpdate({ target: obs.uuid, set: values }).run();
  }
}

/** The generic single-concept write, serving the legacy's three insert paths. */
export function insert(input: ObsInput, on: DbHandle): string {
  return writeOne(input, on);
}

/**
 * Bulk local write. Returns the generated uuids in input order — the legacy
 * discarded them, so callers could not address the rows they had just written.
 */
export function insertMany(inputs: ObsInput[], on: DbHandle): string[] {
  return inputs.map((input) => writeOne(input, on));
}

/** `insert` bound to the ENCOUNTER_TYPE concept. */
export function insertEncounterType(
  input: { encounterUuid: string; value: string; creator: string; creatorUuid: string },
  on: DbHandle,
): string {
  return writeOne(
    {
      encounteruuid: input.encounterUuid,
      conceptuuid: ENCOUNTER_TYPE,
      value: input.value,
      comment: '',
      creator: input.creator,
      creatoruuid: input.creatorUuid,
      voided: VOIDED_NO,
    },
    on,
  );
}

/**
 * The "nothing was captured here" marker. Split out of the legacy's
 * `checkObsAndCreateMissedObs`, which read and then wrote in one call —
 * deciding whether to write it is the caller's job, not the repository's.
 */
export function insertMissedEncounterMarker(
  input: { encounterUuid: string; creator: string; creatorUuid: string },
  on: DbHandle,
): string {
  return writeOne(
    {
      encounteruuid: input.encounterUuid,
      conceptuuid: MISSED_ENCOUNTER,
      value: '-',
      comment: '',
      creator: input.creator,
      creatoruuid: input.creatorUuid,
      voided: VOIDED_NO,
    },
    on,
  );
}

/**
 * The 15 admission values, as obs under the visit's Admission encounter.
 * Iterates `ADMISSION_CONCEPTS` so rows land in capture order; absent keys are
 * skipped. Correcting a value means calling this again — `getAdmissionValues`
 * takes the newest row per concept, so the previous value survives as history.
 */
export function writeAdmissionValues(
  input: {
    encounterUuid: string;
    creator: string;
    creatorUuid: string;
    values: Partial<Record<AdmissionConcept, string>>;
  },
  on: DbHandle,
): string[] {
  const written: string[] = [];

  for (const concept of ADMISSION_CONCEPTS) {
    const value = input.values[concept];
    if (value === undefined) continue;

    written.push(
      writeOne(
        {
          encounteruuid: input.encounterUuid,
          conceptuuid: concept,
          value,
          comment: '',
          creator: input.creator,
          creatoruuid: input.creatorUuid,
          voided: VOIDED_NO,
        },
        on,
      ),
    );
  }

  return written;
}

/**
 * Edit by uuid. `comment` is excluded at the TYPE level: it is the alert code
 * and the sole input to the risk score, so an edit must never overwrite it.
 * Prefer writing a new obs — the reads take the newest row per concept.
 */
export function update(uuid: string, patch: ObsUpdate, on: DbHandle): void {
  on.update(obs)
    .set({ ...patch, modified_date: utcIsoTimestamp(), sync: SYNC_DIRTY })
    .where(eq(obs.uuid, uuid))
    .run();
}

/**
 * Soft delete — the only kind there is. Deliberately does NOT write `comment`:
 * the legacy stamped 'Void this' into it, destroying the alert code.
 * One IN-list rather than the legacy's update-per-uuid loop.
 */
export function markVoided(uuids: string[], on: DbHandle): void {
  if (uuids.length === 0) return;

  on.update(obs)
    .set({ voided: VOIDED_YES, modified_date: utcIsoTimestamp(), sync: SYNC_DIRTY })
    .where(inArray(obs.uuid, uuids))
    .run();
}

/**
 * Updates the out-of-time reason. The legacy ALSO flipped `tbl_encounter.sync`
 * here, outside any transaction, so the encounter could be marked dirty while
 * this update failed. That pairing is now the caller's, inside one `transact`.
 */
export function updateOutOfTimeReason(
  encounterUuid: string,
  value: string,
  on: DbHandle,
): void {
  on.update(obs)
    .set({ value, sync: SYNC_DIRTY })
    .where(
      and(eq(obs.encounteruuid, encounterUuid), eq(obs.conceptuuid, OUT_OF_TIME), notVoided),
    )
    .run();
}

// ── reads ─────────────────────────────────────────────────────────────────

/** The base by-encounter read. Everything else on this axis specialises it. */
export function listByEncounter(encounterUuid: string, on: DbHandle): Obs[] {
  return on
    .select()
    .from(obs)
    .where(and(eq(obs.encounteruuid, encounterUuid), notVoided))
    .orderBy(desc(obs.created_date))
    .all();
}

/**
 * Nurse/HW-authored rows only. NOT EXISTS rather than the legacy's
 * `creatoruuid NOT IN (SELECT useruuid ...)`, which returns NOTHING AT ALL as
 * soon as one doctor row has a null `useruuid`. Side effect of the fix: an obs
 * with a null `creatoruuid` is now included, where the legacy dropped it.
 */
export function listByEncounterExcludingDoctors(
  encounterUuid: string,
  on: DbHandle,
): Obs[] {
  return on
    .select()
    .from(obs)
    .where(
      and(
        eq(obs.encounteruuid, encounterUuid),
        notVoided,
        notExists(
          on
            .select({ one: sql`1` })
            .from(provider)
            .where(
              and(eq(provider.useruuid, obs.creatoruuid), eq(provider.role, PROVIDER_ROLE_DOCTOR)),
            ),
        ),
      ),
    )
    .orderBy(desc(obs.created_date))
    .all();
}

/**
 * The push-side dirty query. No voided filter — voided rows must still reach
 * the server. The two complex-image concepts are excluded because they sync
 * through the image path instead.
 */
export function listUnsyncedByEncounter(encounterUuid: string, on: DbHandle): Obs[] {
  return on
    .select()
    .from(obs)
    .where(
      and(
        eq(obs.encounteruuid, encounterUuid),
        eq(obs.sync, SYNC_DIRTY),
        // Matches the legacy: a null conceptuuid is excluded by both spellings.
        notInArray(obs.conceptuuid, [COMPLEX_IMAGE_AD, COMPLEX_IMAGE_PE]),
      ),
    )
    .all();
}

/** Narrow projection — `comment` here is the alert code, not a note. */
export function listCommentsByEncounter(
  encounterUuid: string,
  on: DbHandle,
): ObsComment[] {
  return on
    .select({ conceptuuid: obs.conceptuuid, comment: obs.comment })
    .from(obs)
    .where(and(eq(obs.encounteruuid, encounterUuid), notVoided))
    .all();
}

/**
 * The obs uuid doubles as the on-disk image filename, so this returns ids, not
 * image data. Parameter order normalised — the legacy had it inverted here only.
 */
export function listObsUuidsByEncounterAndConcept(
  encounterUuid: string,
  conceptUuid: string,
  on: DbHandle,
): string[] {
  return on
    .select({ uuid: obs.uuid })
    .from(obs)
    .where(
      and(eq(obs.encounteruuid, encounterUuid), eq(obs.conceptuuid, conceptUuid), notVoided),
    )
    .all()
    .map((row) => row.uuid);
}

/**
 * ORDER BY TRAP, PORTED VERBATIM. The legacy's `order by created_date,
 * obsservermodifieddate desc` binds DESC to the last column only, so
 * created_date sorts ASC and this returns the EARLIEST row despite its name.
 * Nine call sites decide insert-vs-update on it. Change it as its own commit.
 */
export function findObsUuid(
  encounterUuid: string,
  conceptUuid: string,
  on: DbHandle,
): string | null {
  const row = on
    .select({ uuid: obs.uuid })
    .from(obs)
    .where(
      and(eq(obs.encounteruuid, encounterUuid), eq(obs.conceptuuid, conceptUuid), notVoided),
    )
    .orderBy(obs.created_date, desc(obs.obsservermodifieddate))
    .limit(1)
    .get();

  return row?.uuid ?? null;
}

/** Has anything been captured? Excludes the two metadata concepts, so a missed marker counts. */
export function hasDataObs(encounterUuid: string, on: DbHandle): boolean {
  const row = on
    .select({ uuid: obs.uuid })
    .from(obs)
    .where(
      and(
        eq(obs.encounteruuid, encounterUuid),
        notVoided,
        notInArray(obs.conceptuuid, METADATA_CONCEPTS),
      ),
    )
    .limit(1)
    .get();

  return row !== undefined;
}

/**
 * The stricter form: also excludes MISSED_ENCOUNTER, so a missed marker does
 * NOT count as filled. That one concept is the whole difference from
 * `hasDataObs`, and the callers of each depend on it.
 */
export function hasRealObs(encounterUuid: string, on: DbHandle): boolean {
  const row = on
    .select({ uuid: obs.uuid })
    .from(obs)
    .where(
      and(
        eq(obs.encounteruuid, encounterUuid),
        notVoided,
        notInArray(obs.conceptuuid, [...METADATA_CONCEPTS, MISSED_ENCOUNTER]),
      ),
    )
    .limit(1)
    .get();

  return row !== undefined;
}

/**
 * LAST ROW WINS, ported verbatim — the legacy has no ORDER BY, so with more
 * than one birth-outcome obs the winner is whatever SQLite returns last.
 * Adding an ORDER BY is a behaviour change, not a cleanup.
 */
export function getBirthOutcomeValue(encounterUuid: string, on: DbHandle): string | null {
  const rows = on
    .select({ value: obs.value })
    .from(obs)
    .where(
      and(eq(obs.encounteruuid, encounterUuid), notVoided, eq(obs.conceptuuid, BIRTH_OUTCOME)),
    )
    .all();

  return rows.at(-1)?.value ?? null;
}

/**
 * The raw encounter-type string, serving all ten legacy call sites. Resolving
 * it to SOS vs NORMAL is domain logic and belongs in the mapper.
 * Last row wins, with no ORDER BY — see `getBirthOutcomeValue`.
 */
export function getEncounterTypeValue(encounterUuid: string, on: DbHandle): string | null {
  const rows = on
    .select({ value: obs.value })
    .from(obs)
    .where(
      and(
        eq(obs.encounteruuid, encounterUuid),
        notVoided,
        inArray(obs.conceptuuid, METADATA_CONCEPTS),
      ),
    )
    .all();

  return rows.at(-1)?.value ?? null;
}

/** Last row wins, with no ORDER BY, despite the legacy name saying 'Latest'. */
export function getSosStageHourValue(encounterUuid: string, on: DbHandle): string | null {
  const rows = on
    .select({ value: obs.value })
    .from(obs)
    .where(
      and(eq(obs.encounteruuid, encounterUuid), notVoided, eq(obs.conceptuuid, SOS_STAGE_HOUR)),
    )
    .all();

  return rows.at(-1)?.value ?? null;
}

/**
 * Concept-to-value map for the visit-outcome concepts. NO voided filter, unlike
 * nearly every read here — a voided outcome obs still counts, which is the
 * legacy behaviour. Duplicate concepts collapse to the last row, as its HashMap did.
 */
export function getOutcomeConceptValues(
  encounterUuid: string,
  conceptUuids: string[],
  on: DbHandle,
): Record<string, string> {
  if (conceptUuids.length === 0) return {};

  const rows = on
    .select({ conceptuuid: obs.conceptuuid, value: obs.value })
    .from(obs)
    .where(and(eq(obs.encounteruuid, encounterUuid), inArray(obs.conceptuuid, conceptUuids)))
    .all();

  const values: Record<string, string> = {};
  for (const row of rows) {
    if (row.conceptuuid) values[row.conceptuuid] = row.value ?? '';
  }

  return values;
}

export function hasOutOfTimeObs(encounterUuid: string, on: DbHandle): boolean {
  const row = on
    .select({ uuid: obs.uuid })
    .from(obs)
    .where(
      and(eq(obs.encounteruuid, encounterUuid), notVoided, eq(obs.conceptuuid, OUT_OF_TIME)),
    )
    .limit(1)
    .get();

  return row !== undefined;
}

/**
 * Rows for a caller-supplied concept list. No voided filter, matching the
 * legacy. Order is SQLite's — decorating rows with display names and sorting
 * them is the mapper's job, not this one's.
 */
export function listByEncounterAndConcepts(
  encounterUuid: string,
  conceptUuids: string[],
  on: DbHandle,
): ObsProjection[] {
  if (conceptUuids.length === 0) return [];

  return on
    .select({
      uuid: obs.uuid,
      encounteruuid: obs.encounteruuid,
      conceptuuid: obs.conceptuuid,
      value: obs.value,
      comment: obs.comment,
    })
    .from(obs)
    .where(and(eq(obs.encounteruuid, encounterUuid), inArray(obs.conceptuuid, conceptUuids)))
    .all();
}

/**
 * The weighted alert score: 'R' scores 2, 'Y' scores 1, anything else 0.
 * A SUM, not the count its legacy name promises. No voided filter, so a voided
 * obs still contributes — preserved deliberately.
 */
export function getEncounterAlertScore(encounterUuid: string, on: DbHandle): number {
  const row = on
    .select({
      total: sql<
        number | null
      >`sum(case when ${obs.comment} = 'R' then 2 when ${obs.comment} = 'Y' then 1 else 0 end)`,
    })
    .from(obs)
    .where(eq(obs.encounteruuid, encounterUuid))
    .get();

  return row?.total ?? 0;
}

/** One check for both legacy variants; they differed only in the concept uuid. */
export function existsByEncounterConceptValue(
  encounterUuid: string,
  conceptUuid: string,
  value: string,
  on: DbHandle,
): boolean {
  const row = on
    .select({ uuid: obs.uuid })
    .from(obs)
    .where(
      and(
        eq(obs.encounteruuid, encounterUuid),
        eq(obs.conceptuuid, conceptUuid),
        eq(obs.value, value),
        notVoided,
      ),
    )
    .limit(1)
    .get();

  return row !== undefined;
}

/**
 * Every admission value of a visit, concept to value. Newest row per concept
 * wins, which is what makes "editing is a new obs" work.
 * Unlike its neighbours this does NOT skip rows with a blank comment — the
 * admission writes set none. That exception is deliberate; keep it.
 */
export function getAdmissionValues(visitUuid: string, on: DbHandle): Record<string, string> {
  if (!visitUuid) return {};

  const rows = on
    .select({ conceptuuid: obs.conceptuuid, value: obs.value })
    .from(obs)
    .innerJoin(encounter, eq(obs.encounteruuid, encounter.uuid))
    .where(
      and(
        eq(encounter.visituuid, visitUuid),
        eq(encounter.encounter_type_uuid, ENCOUNTER_ADMISSION),
        notVoided,
        eq(encounter.voided, VOIDED_NO),
      ),
    )
    .orderBy(desc(obs.created_date))
    .all();

  const values: Record<string, string> = {};
  for (const row of rows) {
    if (!row.conceptuuid || row.conceptuuid in values) continue;
    values[row.conceptuuid] = row.value ?? '';
  }

  return values;
}

/**
 * The full series for one concept across a visit, ascending in time — a trend
 * plot, not a latest-value read. Rows with a blank comment OR a blank value are
 * skipped: the comment carries the alert code, so a value without one is
 * invisible to the risk engine by design.
 */
export function listObsByVisitAndConcept(
  visitUuid: string,
  conceptUuid: string,
  on: DbHandle,
): ObsAtEncounterTime[] {
  return on
    .select({
      uuid: obs.uuid,
      encounteruuid: obs.encounteruuid,
      conceptuuid: obs.conceptuuid,
      value: obs.value,
      comment: obs.comment,
      encounterTime: encounter.encounter_time,
    })
    .from(obs)
    .innerJoin(encounter, eq(obs.encounteruuid, encounter.uuid))
    .where(
      and(
        eq(encounter.visituuid, visitUuid),
        eq(obs.conceptuuid, conceptUuid),
        notVoided,
        eq(encounter.voided, VOIDED_NO),
      ),
    )
    .orderBy(encounter.encounter_time)
    .all()
    .filter((row) => filled(row.comment) && filled(row.value));
}

/** No encounter-voided filter here, unlike its neighbours — the legacy behaviour. */
export function hasAnyObsForVisit(visitUuid: string, on: DbHandle): boolean {
  const row = on
    .select({ uuid: obs.uuid })
    .from(obs)
    .innerJoin(encounter, eq(obs.encounteruuid, encounter.uuid))
    .where(and(eq(encounter.visituuid, visitUuid), notVoided))
    .limit(1)
    .get();

  return row !== undefined;
}

/**
 * TRAP: DELIVERY_OUTCOME_STAGE3 is matched against `encounter_type_uuid`, NOT
 * `conceptuuid`, even though it sits among the concept uuids in the legacy
 * dictionary. Do not "correct" this into a concept filter.
 */
export function hasStage3ObsForVisit(visitUuid: string, on: DbHandle): boolean {
  const row = on
    .select({ uuid: obs.uuid })
    .from(obs)
    .innerJoin(encounter, eq(obs.encounteruuid, encounter.uuid))
    .where(
      and(
        eq(encounter.visituuid, visitUuid),
        eq(encounter.encounter_type_uuid, DELIVERY_OUTCOME_STAGE3),
        notVoided,
      ),
    )
    .limit(1)
    .get();

  return row !== undefined;
}

/**
 * The risk-score inputs, stage-aware: once the visit reaches stage 3 only
 * stage-3 encounters (and SOS encounters tagged stage 3) are admitted,
 * otherwise only stages 1 and 2. Raw SQL on purpose — the CASE drives off a
 * correlated subquery, and this is ported verbatim rather than re-expressed.
 * It reads `tbl_uuid_dictionary.name`, so that table must be seeded.
 */
export function getLatestObsByVisitAndConcepts(
  visitUuid: string,
  conceptUuids: string[],
  on: DbHandle,
): RiskObs[] {
  const concepts = [...new Set(conceptUuids)];
  if (concepts.length === 0) return [];

  const conceptList = sql.join(
    concepts.map((concept) => sql`${concept}`),
    sql`, `,
  );

  const rows = on.all<RiskObs>(sql`
    SELECT o.comment, o.conceptuuid, o.encounteruuid, o.value
    FROM tbl_obs o
    INNER JOIN tbl_encounter e ON o.encounteruuid = e.uuid
    LEFT JOIN tbl_uuid_dictionary ud ON e.encounter_type_uuid = ud.uuid
    WHERE e.visituuid = ${visitUuid}
      AND o.voided = ${VOIDED_NO}
      AND e.voided = ${VOIDED_NO}
      AND o.conceptuuid IN (${conceptList})
      AND CASE
        WHEN (
          SELECT ud2.name
          FROM tbl_encounter e2
          LEFT JOIN tbl_uuid_dictionary ud2 ON e2.encounter_type_uuid = ud2.uuid
          WHERE e2.visituuid = e.visituuid
            AND e2.voided = ${VOIDED_NO}
            AND ud2.name LIKE 'Stage%'
          ORDER BY e2.encounter_time DESC
          LIMIT 1
        ) LIKE 'Stage3_%'
        THEN (
          ud.name LIKE 'Stage3_%'
          OR (ud.name = 'LCG_SOS' AND EXISTS (
            SELECT 1 FROM tbl_obs sos_o
            WHERE sos_o.encounteruuid = o.encounteruuid
              AND sos_o.conceptuuid = ${SOS_STAGE_HOUR}
              AND sos_o.value LIKE 'Stage3_%'
          ))
        )
        ELSE (
          ud.name LIKE 'Stage1_%' OR ud.name LIKE 'Stage2_%'
          OR (ud.name = 'LCG_SOS' AND EXISTS (
            SELECT 1 FROM tbl_obs sos_o
            WHERE sos_o.encounteruuid = o.encounteruuid
              AND sos_o.conceptuuid = ${SOS_STAGE_HOUR}
              AND (sos_o.value LIKE 'Stage1_%' OR sos_o.value LIKE 'Stage2_%')
          ))
        )
      END
    ORDER BY e.encounter_time DESC, o.created_date DESC
  `);

  const latest = new Map<string, RiskObs>();
  for (const row of rows) {
    if (!row.conceptuuid || latest.has(row.conceptuuid)) continue;
    if (!filled(row.comment) || !filled(row.value)) continue;

    latest.set(row.conceptuuid, row);
    if (latest.size === concepts.length) break;
  }

  return [...latest.values()];
}
