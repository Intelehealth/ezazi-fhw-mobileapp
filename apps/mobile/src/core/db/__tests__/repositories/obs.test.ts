import { eq } from 'drizzle-orm';

import {
  DELIVERY_OUTCOME_STAGE3,
  ENCOUNTER_ADMISSION,
  LCG_SOS,
  STAGE1_HOUR1_1,
  STAGE3_HOUR1_1,
} from '../../constants/encounter';
import {
  ADMISSION_CONCEPTS,
  BIRTH_OUTCOME,
  CERVIX_PLOT_X,
  COMPLEX_IMAGE_AD,
  ENCOUNTER_TYPE,
  MISSED_ENCOUNTER,
  OBS_BED_NUMBER,
  OBS_GRAVIDA,
  OUT_OF_TIME,
  SOS_STAGE_HOUR,
} from '../../constants/obs';
import { PROVIDER_ROLE_DOCTOR } from '../../constants/literals';
import {
  existsByEncounterConceptValue,
  findObsUuid,
  getAdmissionValues,
  getBirthOutcomeValue,
  getEncounterTypeValue,
  getLatestObsByVisitAndConcepts,
  getOutcomeConceptValues,
  getSosStageHourValue,
  hasAnyObsForVisit,
  hasDataObs,
  hasOutOfTimeObs,
  hasRealObs,
  hasStage3ObsForVisit,
  insert,
  listCervixReadingsByVisit,
  insertEncounterType,
  insertMany,
  insertMissedEncounterMarker,
  listByEncounter,
  listByEncounterNewestFirst,
  listByEncounterAndConcepts,
  listByEncounterExcludingDoctors,
  listCommentsByEncounter,
  listObsByVisitAndConcept,
  listObsUuidsByEncounterAndConcept,
  listUnsyncedByEncounter,
  markVoided,
  update,
  updateOutOfTimeReason,
  upsertManyFromServer,
  writeAdmissionValues,
} from '../../repositories/obs';
import { encounter, obs, provider } from '../../schema';
import { SYNC_CLEAN, SYNC_DIRTY, VOIDED_NO, VOIDED_YES } from '../../syncFlags';
import { transact, type DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * Above all: `comment` is the alert code and must survive every write path.
 * Then the ordering traps and absent voided filters that were ported verbatim —
 * each of those tests exists to stop a later reader "tidying" one away.
 */

// Monotonic, so `created_date` ordering is deterministic instead of clock-dependent.
let mockTick = 0;

jest.mock('@/core/utils/datetime', () => ({
  utcIsoTimestamp: () =>
    `2026-01-01T00:00:00.${String((mockTick += 1)).padStart(3, '0')}+0000`,
  localIsoTimestamp: () => '2026-01-01T00:00:00.000+0530',
}));

const VISIT = 'v1';
const ENC = 'e1';
const CONCEPT_A = 'concept-a';
const CONCEPT_B = 'concept-b';
const CREW = { creator: '7', creatorUuid: 'nurse-1' };

describe('obs repository', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
    mockTick = 0;
  });

  afterEach(() => ctx.close());

  const rows = () => ctx.db.select().from(obs).all();
  const row = (uuid: string) => ctx.db.select().from(obs).where(eq(obs.uuid, uuid)).get();

  const seedEncounter = (
    uuid: string,
    extra: Partial<typeof encounter.$inferInsert> = {},
  ): string => {
    ctx.db
      .insert(encounter)
      .values({ uuid, visituuid: VISIT, voided: VOIDED_NO, ...extra })
      .run();
    return uuid;
  };

  describe('the comment column', () => {
    it('survives markVoided', () => {
      // The legacy stamped 'Void this' here, destroying the alert code.
      const uuid = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, comment: 'R' }, db);
      markVoided([uuid], db);

      expect(row(uuid)).toMatchObject({ comment: 'R', voided: VOIDED_YES, sync: SYNC_DIRTY });
    });

    it('survives an update', () => {
      const uuid = insert(
        { encounteruuid: ENC, conceptuuid: CONCEPT_A, value: '1', comment: 'Y' },
        db,
      );
      update(uuid, { encounteruuid: ENC, conceptuuid: CONCEPT_A, value: '2' }, db);

      expect(row(uuid)).toMatchObject({ value: '2', comment: 'Y' });
    });

    it('cannot be set through update at all', () => {
      const uuid = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, comment: 'R' }, db);

      // @ts-expect-error ObsUpdate omits `comment` — this is the guard, at compile time.
      update(uuid, { encounteruuid: ENC, conceptuuid: CONCEPT_A, comment: 'Y' }, db);
    });

    it('voids a batch in one statement and leaves non-members alone', () => {
      const a = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, comment: 'R' }, db);
      const b = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_B, comment: 'Y' }, db);
      const c = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A }, db);

      markVoided([a, b], db);

      expect(row(a)?.voided).toBe(VOIDED_YES);
      expect(row(b)?.voided).toBe(VOIDED_YES);
      expect(row(c)?.voided).toBe(VOIDED_NO);
    });

    it('ignores an empty batch', () => {
      const uuid = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A }, db);
      markVoided([], db);

      expect(row(uuid)?.voided).toBe(VOIDED_NO);
    });
  });

  describe('writes', () => {
    it('returns the minted uuid so the caller can address the row', () => {
      // The legacy generated one and threw it away; the obs uuid is also the
      // on-disk image filename, so callers genuinely need it back.
      const uuid = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A }, db);

      expect(row(uuid)).toBeDefined();
    });

    it('honours a caller-supplied uuid', () => {
      expect(insert({ uuid: 'mine', encounteruuid: ENC, conceptuuid: CONCEPT_A }, db)).toBe('mine');
    });

    it('always writes created_date', () => {
      // Four legacy writers left it NULL, so every `order by created_date`
      // read — getAdmissionValues included — sorted arbitrarily.
      const uuid = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A }, db);

      expect(row(uuid)?.created_date).toBeTruthy();
    });

    it('keeps a caller-supplied created_date', () => {
      const uuid = insert(
        { encounteruuid: ENC, conceptuuid: CONCEPT_A, created_date: '2020-01-01' },
        db,
      );

      expect(row(uuid)?.created_date).toBe('2020-01-01');
    });

    it('writes local rows dirty and pulled rows clean', () => {
      const local = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A }, db);
      upsertManyFromServer([{ uuid: 'pulled', encounteruuid: ENC, conceptuuid: CONCEPT_A }], db);

      expect(row(local)?.sync).toBe(SYNC_DIRTY);
      expect(row('pulled')?.sync).toBe(SYNC_CLEAN);
    });

    it('updates a pulled row by explicit column set, never a whole-row replace', () => {
      upsertManyFromServer(
        [{ uuid: 's1', encounteruuid: ENC, conceptuuid: CONCEPT_A, comment: 'R', value: '1' }],
        db,
      );
      upsertManyFromServer([{ uuid: 's1', encounteruuid: ENC, conceptuuid: CONCEPT_A, value: '2' }], db);

      expect(rows()).toHaveLength(1);
      expect(row('s1')?.value).toBe('2');
    });

    it('returns uuids in input order from insertMany', () => {
      const written = insertMany(
        [
          { encounteruuid: ENC, conceptuuid: CONCEPT_A, value: 'first' },
          { encounteruuid: ENC, conceptuuid: CONCEPT_B, value: 'second' },
        ],
        db,
      );

      expect(written).toHaveLength(2);
      expect(row(written[0])?.value).toBe('first');
      expect(row(written[1])?.value).toBe('second');
    });

    it('binds the encounter-type and missed-marker concepts', () => {
      const type = insertEncounterType({ encounterUuid: ENC, value: 'SOS', ...CREW }, db);
      const missed = insertMissedEncounterMarker({ encounterUuid: ENC, ...CREW }, db);

      expect(row(type)).toMatchObject({ conceptuuid: ENCOUNTER_TYPE, value: 'SOS' });
      expect(row(missed)).toMatchObject({ conceptuuid: MISSED_ENCOUNTER, value: '-' });
    });

    // Deviation (2026-10-27, Kaveri): Android leaves creatoruuid and created_date NULL here.
    it('writes the missed marker as Android does, with its creator uuid and created date filled', () => {
      const missed = insertMissedEncounterMarker({ encounterUuid: ENC, ...CREW }, db);

      expect(row(missed)).toMatchObject({
        comment: '',
        creator: CREW.creator,
        creatoruuid: CREW.creatorUuid,
        voided: VOIDED_NO,
        sync: SYNC_DIRTY,
      });
      expect(row(missed)?.created_date).toMatch(/^2026-01-01T/); // the mocked write time
    });

    it('updates only the obs row for an out-of-time reason', () => {
      // The legacy also flipped tbl_encounter.sync here, outside any
      // transaction. That pairing is the caller's now.
      seedEncounter(ENC, { sync: SYNC_CLEAN });
      insert({ encounteruuid: ENC, conceptuuid: OUT_OF_TIME, value: 'old' }, db);

      updateOutOfTimeReason(ENC, 'late', db);

      expect(rows()[0]).toMatchObject({ value: 'late', sync: SYNC_DIRTY });
      expect(ctx.db.select().from(encounter).get()?.sync).toBe(SYNC_CLEAN);
    });
  });

  describe('admission values', () => {
    const writeAdmission = (values: Record<string, string>) => {
      seedEncounter('adm', { encounter_type_uuid: ENCOUNTER_ADMISSION });
      return writeAdmissionValues({ encounterUuid: 'adm', ...CREW, values }, db);
    };

    it('round-trips through getAdmissionValues', () => {
      writeAdmission({ [OBS_BED_NUMBER]: 'bed-7', [OBS_GRAVIDA]: '2' });

      expect(getAdmissionValues(VISIT, db)).toEqual({
        [OBS_BED_NUMBER]: 'bed-7',
        [OBS_GRAVIDA]: '2',
      });
    });

    it('writes rows in ADMISSION_CONCEPTS capture order, skipping absent keys', () => {
      const written = writeAdmission({ [OBS_BED_NUMBER]: 'bed-7', [OBS_GRAVIDA]: '2' });

      expect(written).toHaveLength(2);
      // Gravida is captured before bed number, whatever order the caller used.
      const order = rows()
        .sort((a, b) => (a.created_date ?? '').localeCompare(b.created_date ?? ''))
        .map((entry) => entry.conceptuuid);
      expect(order).toEqual([OBS_GRAVIDA, OBS_BED_NUMBER]);
      expect(ADMISSION_CONCEPTS.indexOf(OBS_GRAVIDA)).toBeLessThan(
        ADMISSION_CONCEPTS.indexOf(OBS_BED_NUMBER),
      );
    });

    it('edits by writing a new obs — latest wins, history survives', () => {
      writeAdmission({ [OBS_BED_NUMBER]: 'bed-7' });
      writeAdmissionValues(
        { encounterUuid: 'adm', ...CREW, values: { [OBS_BED_NUMBER]: 'bed-9' } },
        db,
      );

      expect(getAdmissionValues(VISIT, db)[OBS_BED_NUMBER]).toBe('bed-9');
      expect(rows()).toHaveLength(2);
    });

    it('reads nothing from a non-admission encounter', () => {
      seedEncounter('other', { encounter_type_uuid: 'some-other-type' });
      insert({ encounteruuid: 'other', conceptuuid: OBS_BED_NUMBER, value: 'bed-7' }, db);

      expect(getAdmissionValues(VISIT, db)).toEqual({});
    });

    it('skips a voided obs and a voided admission encounter', () => {
      const written = writeAdmission({ [OBS_BED_NUMBER]: 'bed-7', [OBS_GRAVIDA]: '2' });
      markVoided([written[0]], db);
      expect(Object.keys(getAdmissionValues(VISIT, db))).toEqual([OBS_BED_NUMBER]);

      ctx.db.update(encounter).set({ voided: VOIDED_YES }).where(eq(encounter.uuid, 'adm')).run();
      expect(getAdmissionValues(VISIT, db)).toEqual({});
    });

    it('guards a blank visit uuid', () => {
      expect(getAdmissionValues('', db)).toEqual({});
    });

    it('keeps a row whose comment is blank', () => {
      // The one read in this file that deliberately does NOT apply the
      // blank-comment skip — the admission writes set no comment at all.
      writeAdmission({ [OBS_BED_NUMBER]: 'bed-7' });

      expect(rows()[0]?.comment).toBe('');
      expect(getAdmissionValues(VISIT, db)[OBS_BED_NUMBER]).toBe('bed-7');
    });
  });

  describe('encounter reads', () => {
    it('listByEncounter skips voided rows and sorts newest first', () => {
      const first = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: '1' }, db);
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_B, value: '2' }, db);
      const voided = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: '3' }, db);
      markVoided([voided], db);

      const found = listByEncounter(ENC, db);
      expect(found.map((entry) => entry.value)).toEqual(['2', '1']);
      expect(found.map((entry) => entry.uuid)).not.toContain(voided);
      expect(found[1].uuid).toBe(first);
    });

    it('listCommentsByEncounter projects the alert code only', () => {
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, comment: 'R', value: 'x' }, db);

      expect(listCommentsByEncounter(ENC, db)).toEqual([
        { conceptuuid: CONCEPT_A, comment: 'R' },
      ]);
    });

    it('listObsUuidsByEncounterAndConcept returns ids, not values', () => {
      const uuid = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: 'img' }, db);
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_B, value: 'other' }, db);

      expect(listObsUuidsByEncounterAndConcept(ENC, CONCEPT_A, db)).toEqual([uuid]);
    });

    it('existsByEncounterConceptValue matches on all three', () => {
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: 'yes' }, db);

      expect(existsByEncounterConceptValue(ENC, CONCEPT_A, 'yes', db)).toBe(true);
      expect(existsByEncounterConceptValue(ENC, CONCEPT_A, 'no', db)).toBe(false);
      expect(existsByEncounterConceptValue(ENC, CONCEPT_B, 'yes', db)).toBe(false);
    });
  });

  describe('the push-side dirty query', () => {
    it('includes voided rows — they must still reach the server', () => {
      const uuid = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A }, db);
      markVoided([uuid], db);

      expect(listUnsyncedByEncounter(ENC, db).map((entry) => entry.uuid)).toEqual([uuid]);
    });

    it('excludes the complex-image concepts, which sync through the image path', () => {
      insert({ encounteruuid: ENC, conceptuuid: COMPLEX_IMAGE_AD }, db);
      const normal = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A }, db);

      expect(listUnsyncedByEncounter(ENC, db).map((entry) => entry.uuid)).toEqual([normal]);
    });

    it('excludes rows the server already holds', () => {
      upsertManyFromServer([{ uuid: 'pulled', encounteruuid: ENC, conceptuuid: CONCEPT_A }], db);

      expect(listUnsyncedByEncounter(ENC, db)).toEqual([]);
    });
  });

  describe('excluding doctor-authored rows', () => {
    const seedProvider = (useruuid: string | null, role: string) =>
      ctx.db
        .insert(provider)
        .values({ uuid: `p-${role}-${useruuid ?? 'null'}`, useruuid, role })
        .run();

    it('drops rows a doctor wrote and keeps the rest', () => {
      seedProvider('dr-1', PROVIDER_ROLE_DOCTOR);
      seedProvider('nurse-1', 'Organizational: Nurse');
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, creatoruuid: 'dr-1' }, db);
      const nurse = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_B, creatoruuid: 'nurse-1' }, db);

      expect(listByEncounterExcludingDoctors(ENC, db).map((entry) => entry.uuid)).toEqual([nurse]);
    });

    it('still returns rows when a doctor has a null useruuid', () => {
      // The legacy's `NOT IN (SELECT useruuid ...)` returns NOTHING AT ALL once
      // one row in that subquery is null. This is why it is NOT EXISTS here.
      seedProvider(null, PROVIDER_ROLE_DOCTOR);
      const nurse = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, creatoruuid: 'nurse-1' }, db);

      expect(listByEncounterExcludingDoctors(ENC, db).map((entry) => entry.uuid)).toEqual([nurse]);
    });
  });

  describe('has-data checks, which differ by exactly one concept', () => {
    it('hasDataObs counts a missed marker as filled; hasRealObs does not', () => {
      insertMissedEncounterMarker({ encounterUuid: ENC, ...CREW }, db);

      expect(hasDataObs(ENC, db)).toBe(true);
      expect(hasRealObs(ENC, db)).toBe(false);
    });

    it('both ignore the two metadata concepts', () => {
      insertEncounterType({ encounterUuid: ENC, value: 'SOS', ...CREW }, db);
      insert({ encounteruuid: ENC, conceptuuid: SOS_STAGE_HOUR, value: 'Stage1_Hr1_1' }, db);

      expect(hasDataObs(ENC, db)).toBe(false);
      expect(hasRealObs(ENC, db)).toBe(false);
    });

    it('both see real clinical data', () => {
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: '1' }, db);

      expect(hasDataObs(ENC, db)).toBe(true);
      expect(hasRealObs(ENC, db)).toBe(true);
    });

    it('both skip voided rows', () => {
      const uuid = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A }, db);
      markVoided([uuid], db);

      expect(hasDataObs(ENC, db)).toBe(false);
      expect(hasRealObs(ENC, db)).toBe(false);
    });
  });

  describe('ordering ported verbatim, traps included', () => {
    it('findObsUuid returns the EARLIEST row, despite the name', () => {
      // `order by created_date, obsservermodifieddate desc` binds DESC to the
      // last column only. Nine call sites decide insert-vs-update on this.
      const first = insert(
        { encounteruuid: ENC, conceptuuid: CONCEPT_A, created_date: '2026-01-01' },
        db,
      );
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, created_date: '2026-06-01' }, db);

      expect(findObsUuid(ENC, CONCEPT_A, db)).toBe(first);
    });

    it('findObsUuid skips voided rows and misses cleanly', () => {
      expect(findObsUuid(ENC, CONCEPT_A, db)).toBeNull();

      const uuid = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A }, db);
      markVoided([uuid], db);
      expect(findObsUuid(ENC, CONCEPT_A, db)).toBeNull();
    });

    it('the three last-row-wins reads have no ORDER BY', () => {
      // Preserved deliberately: adding one is a behaviour change, not a fix.
      insert({ encounteruuid: ENC, conceptuuid: BIRTH_OUTCOME, value: 'first' }, db);
      insert({ encounteruuid: ENC, conceptuuid: BIRTH_OUTCOME, value: 'last' }, db);
      insert({ encounteruuid: ENC, conceptuuid: SOS_STAGE_HOUR, value: 'Stage1_Hr1_1' }, db);
      insertEncounterType({ encounterUuid: ENC, value: 'NORMAL', ...CREW }, db);

      expect(getBirthOutcomeValue(ENC, db)).toBe('last');
      expect(getSosStageHourValue(ENC, db)).toBe('Stage1_Hr1_1');
      // Reads BOTH metadata concepts, so the later row wins across them.
      expect(getEncounterTypeValue(ENC, db)).toBe('NORMAL');
    });

    it('the last-row-wins reads return null on a miss', () => {
      expect(getBirthOutcomeValue(ENC, db)).toBeNull();
      expect(getSosStageHourValue(ENC, db)).toBeNull();
      expect(getEncounterTypeValue(ENC, db)).toBeNull();
    });
  });

  describe('voided filters deliberately absent', () => {
    it('getOutcomeConceptValues counts a voided obs', () => {
      const uuid = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: 'x' }, db);
      markVoided([uuid], db);

      expect(getOutcomeConceptValues(ENC, [CONCEPT_A], db)).toEqual({ [CONCEPT_A]: 'x' });
    });

    it('getOutcomeConceptValues collapses duplicates to the last row and normalises null', () => {
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: 'first' }, db);
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: 'last' }, db);
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_B }, db);

      expect(getOutcomeConceptValues(ENC, [CONCEPT_A, CONCEPT_B], db)).toEqual({
        [CONCEPT_A]: 'last',
        [CONCEPT_B]: '',
      });
    });

    it('getOutcomeConceptValues and listByEncounterAndConcepts guard an empty list', () => {
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: 'x' }, db);

      expect(getOutcomeConceptValues(ENC, [], db)).toEqual({});
      expect(listByEncounterAndConcepts(ENC, [], db)).toEqual([]);
    });

    it('listByEncounterAndConcepts counts a voided obs and filters by concept', () => {
      const uuid = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: 'x' }, db);
      markVoided([uuid], db);
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_B, value: 'y' }, db);

      expect(listByEncounterAndConcepts(ENC, [CONCEPT_A], db)).toEqual([
        {
          uuid,
          encounteruuid: ENC,
          conceptuuid: CONCEPT_A,
          value: 'x',
          comment: null,
        },
      ]);
    });

    it('hasOutOfTimeObs DOES skip voided rows, unlike its neighbours', () => {
      const uuid = insert({ encounteruuid: ENC, conceptuuid: OUT_OF_TIME, value: 'late' }, db);
      expect(hasOutOfTimeObs(ENC, db)).toBe(true);

      markVoided([uuid], db);
      expect(hasOutOfTimeObs(ENC, db)).toBe(false);
    });
  });

  describe('same-second rows', () => {
    it('lists a card newest first, and falls back to insert order within the same second', () => {
      const same = '2026-10-23 10:00:00';
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: 'first', created_date: same }, db);
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: 'second', created_date: same }, db);
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: 'older', created_date: '2026-10-23 09:59:59' }, db);

      expect(listByEncounterNewestFirst(ENC, db).map((row) => row.value)).toEqual(['second', 'first', 'older']);
    });
  });

  describe('cervix readings for the risk score', () => {
    it('returns the visit\'s Cervix values oldest card first, skipping blank codes and voided rows', () => {
      seedEncounter('late', { encounter_time: '2026-10-23 10:00:00' });
      seedEncounter('early', { encounter_time: '2026-10-23 08:00:00' });
      seedEncounter('gone', { encounter_time: '2026-10-23 09:00:00', voided: VOIDED_YES });
      insert({ encounteruuid: 'late', conceptuuid: CERVIX_PLOT_X, value: '7', comment: 'G' }, db);
      insert({ encounteruuid: 'early', conceptuuid: CERVIX_PLOT_X, value: '6', comment: 'G' }, db);
      insert({ encounteruuid: 'early', conceptuuid: CERVIX_PLOT_X, value: '5', comment: '' }, db);
      insert({ encounteruuid: 'gone', conceptuuid: CERVIX_PLOT_X, value: '9', comment: 'G' }, db);
      const voided = insert({ encounteruuid: 'late', conceptuuid: CERVIX_PLOT_X, value: '8', comment: 'G' }, db);
      markVoided([voided], db);

      expect(listCervixReadingsByVisit(VISIT, db)).toEqual([
        { value: '6', encounterTime: '2026-10-23 08:00:00' },
        { value: '7', encounterTime: '2026-10-23 10:00:00' },
      ]);
    });

    it('returns nothing for a visit with no Cervix values', () => {
      expect(listCervixReadingsByVisit('nothing-here', db)).toEqual([]);
    });
  });

  describe('visit-scoped reads', () => {
    it('hasAnyObsForVisit joins through the encounter and skips voided obs', () => {
      seedEncounter(ENC);
      expect(hasAnyObsForVisit(VISIT, db)).toBe(false);

      const uuid = insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A }, db);
      expect(hasAnyObsForVisit(VISIT, db)).toBe(true);

      markVoided([uuid], db);
      expect(hasAnyObsForVisit(VISIT, db)).toBe(false);
    });

    it('hasAnyObsForVisit ignores a voided ENCOUNTER, unlike its neighbours', () => {
      seedEncounter(ENC, { voided: VOIDED_YES });
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A }, db);

      expect(hasAnyObsForVisit(VISIT, db)).toBe(true);
    });

    it('hasStage3ObsForVisit matches the ENCOUNTER TYPE, not the concept', () => {
      // The constant sits among concept uuids in the legacy dictionary. It is
      // still an encounter type here, and must not be "corrected".
      seedEncounter(ENC, { encounter_type_uuid: DELIVERY_OUTCOME_STAGE3 });
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A }, db);

      expect(hasStage3ObsForVisit(VISIT, db)).toBe(true);
    });

    it('hasStage3ObsForVisit is false when only the CONCEPT matches', () => {
      seedEncounter(ENC, { encounter_type_uuid: 'some-other-type' });
      insert({ encounteruuid: ENC, conceptuuid: DELIVERY_OUTCOME_STAGE3 }, db);

      expect(hasStage3ObsForVisit(VISIT, db)).toBe(false);
    });

    it('listObsByVisitAndConcept returns the series ascending by encounter time', () => {
      seedEncounter('later', { encounter_time: '2026-06-01' });
      seedEncounter('earlier', { encounter_time: '2026-01-01' });
      insert({ encounteruuid: 'later', conceptuuid: CONCEPT_A, value: '2', comment: 'Y' }, db);
      insert({ encounteruuid: 'earlier', conceptuuid: CONCEPT_A, value: '1', comment: 'R' }, db);

      const series = listObsByVisitAndConcept(VISIT, CONCEPT_A, db);
      expect(series.map((entry) => entry.value)).toEqual(['1', '2']);
      expect(series[0].encounterTime).toBe('2026-01-01');
    });

    it('listObsByVisitAndConcept skips rows with a blank comment OR a blank value', () => {
      // The comment carries the alert code, so a value without one is
      // invisible to the risk engine by design.
      seedEncounter(ENC, { encounter_time: '2026-01-01' });
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: '1' }, db);
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: '2', comment: '  ' }, db);
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, comment: 'R' }, db);
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: '4', comment: 'R' }, db);

      expect(listObsByVisitAndConcept(VISIT, CONCEPT_A, db).map((entry) => entry.value)).toEqual([
        '4',
      ]);
    });

    it('listObsByVisitAndConcept skips a voided encounter', () => {
      seedEncounter(ENC, { encounter_time: '2026-01-01', voided: VOIDED_YES });
      insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A, value: '1', comment: 'R' }, db);

      expect(listObsByVisitAndConcept(VISIT, CONCEPT_A, db)).toEqual([]);
    });
  });

  describe('the stage-aware risk read', () => {
    // Real encounter types, because the stage sets are now resolved from
    // constants/encounter rather than from a seeded dictionary table.
    const TYPE_STAGE1 = STAGE1_HOUR1_1;
    const TYPE_STAGE3 = STAGE3_HOUR1_1;
    const TYPE_SOS = LCG_SOS;

    it('reads stage 1 and 2 while the visit has not reached stage 3', () => {
      seedEncounter('s1', { encounter_type_uuid: TYPE_STAGE1, encounter_time: '2026-01-01' });
      insert({ encounteruuid: 's1', conceptuuid: CONCEPT_A, value: '1', comment: 'Y' }, db);

      expect(getLatestObsByVisitAndConcepts(VISIT, [CONCEPT_A], db)).toEqual([
        { encounteruuid: 's1', conceptuuid: CONCEPT_A, value: '1', comment: 'Y' },
      ]);
    });

    it('drops the stage-1 row once the visit reaches stage 3', () => {
      seedEncounter('s1', { encounter_type_uuid: TYPE_STAGE1, encounter_time: '2026-01-01' });
      seedEncounter('s3', { encounter_type_uuid: TYPE_STAGE3, encounter_time: '2026-01-03' });
      insert({ encounteruuid: 's1', conceptuuid: CONCEPT_A, value: '1', comment: 'Y' }, db);

      // The stage-3 encounter carries no reading for this concept, and the
      // stage-1 one is no longer admitted — so the risk engine sees nothing.
      expect(getLatestObsByVisitAndConcepts(VISIT, [CONCEPT_A], db)).toEqual([]);
    });

    it('takes the newest encounter per concept', () => {
      seedEncounter('s1a', { encounter_type_uuid: TYPE_STAGE1, encounter_time: '2026-01-01' });
      seedEncounter('s1b', { encounter_type_uuid: TYPE_STAGE1, encounter_time: '2026-01-02' });
      insert({ encounteruuid: 's1a', conceptuuid: CONCEPT_A, value: 'old', comment: 'Y' }, db);
      insert({ encounteruuid: 's1b', conceptuuid: CONCEPT_A, value: 'new', comment: 'R' }, db);

      expect(getLatestObsByVisitAndConcepts(VISIT, [CONCEPT_A], db)).toEqual([
        { encounteruuid: 's1b', conceptuuid: CONCEPT_A, value: 'new', comment: 'R' },
      ]);
    });

    it('admits an SOS encounter tagged with a stage-3 hour', () => {
      seedEncounter('s3', { encounter_type_uuid: TYPE_STAGE3, encounter_time: '2026-01-03' });
      seedEncounter('sos', { encounter_type_uuid: TYPE_SOS, encounter_time: '2026-01-04' });
      insert({ encounteruuid: 'sos', conceptuuid: SOS_STAGE_HOUR, value: 'Stage3_Hr2_1' }, db);
      insert({ encounteruuid: 'sos', conceptuuid: CONCEPT_A, value: 'sos-value', comment: 'R' }, db);

      expect(getLatestObsByVisitAndConcepts(VISIT, [CONCEPT_A], db)).toEqual([
        { encounteruuid: 'sos', conceptuuid: CONCEPT_A, value: 'sos-value', comment: 'R' },
      ]);
    });

    it('rejects an SOS encounter tagged with the wrong stage', () => {
      seedEncounter('s3', { encounter_type_uuid: TYPE_STAGE3, encounter_time: '2026-01-03' });
      seedEncounter('sos', { encounter_type_uuid: TYPE_SOS, encounter_time: '2026-01-04' });
      insert({ encounteruuid: 'sos', conceptuuid: SOS_STAGE_HOUR, value: 'Stage1_Hr1_1' }, db);
      insert({ encounteruuid: 'sos', conceptuuid: CONCEPT_A, value: 'sos-value', comment: 'R' }, db);

      expect(getLatestObsByVisitAndConcepts(VISIT, [CONCEPT_A], db)).toEqual([]);
    });

    it('skips rows with a blank comment or a blank value', () => {
      seedEncounter('s1', { encounter_type_uuid: TYPE_STAGE1, encounter_time: '2026-01-01' });
      insert({ encounteruuid: 's1', conceptuuid: CONCEPT_A, value: '1' }, db);
      insert({ encounteruuid: 's1', conceptuuid: CONCEPT_B, comment: 'R' }, db);

      expect(getLatestObsByVisitAndConcepts(VISIT, [CONCEPT_A, CONCEPT_B], db)).toEqual([]);
    });

    it('skips voided obs and voided encounters', () => {
      seedEncounter('s1', { encounter_type_uuid: TYPE_STAGE1, encounter_time: '2026-01-01' });
      const uuid = insert(
        { encounteruuid: 's1', conceptuuid: CONCEPT_A, value: '1', comment: 'Y' },
        db,
      );
      markVoided([uuid], db);
      expect(getLatestObsByVisitAndConcepts(VISIT, [CONCEPT_A], db)).toEqual([]);

      markVoided([], db);
      ctx.db.update(obs).set({ voided: VOIDED_NO }).where(eq(obs.uuid, uuid)).run();
      ctx.db.update(encounter).set({ voided: VOIDED_YES }).where(eq(encounter.uuid, 's1')).run();
      expect(getLatestObsByVisitAndConcepts(VISIT, [CONCEPT_A], db)).toEqual([]);
    });

    it('returns nothing for an empty concept list', () => {
      seedEncounter('s1', { encounter_type_uuid: TYPE_STAGE1, encounter_time: '2026-01-01' });
      insert({ encounteruuid: 's1', conceptuuid: CONCEPT_A, value: '1', comment: 'Y' }, db);

      expect(getLatestObsByVisitAndConcepts(VISIT, [], db)).toEqual([]);
    });

    it('excludes an unknown encounter type without emptying the read', () => {
      // This replaces a test for the opposite behaviour. The dictionary version
      // matched the whole CASE on ud.name, so an unseeded table returned
      // NOTHING AT ALL. The stage sets are constants now, so a type we do not
      // know excludes only its own encounter.
      seedEncounter('s1', { encounter_type_uuid: TYPE_STAGE1, encounter_time: '2026-01-01' });
      seedEncounter('other', { encounter_type_uuid: 'not-a-stage', encounter_time: '2026-01-02' });
      insert({ encounteruuid: 's1', conceptuuid: CONCEPT_A, value: '1', comment: 'Y' }, db);
      insert({ encounteruuid: 'other', conceptuuid: CONCEPT_B, value: '2', comment: 'R' }, db);

      expect(getLatestObsByVisitAndConcepts(VISIT, [CONCEPT_A, CONCEPT_B], db)).toEqual([
        { encounteruuid: 's1', conceptuuid: CONCEPT_A, value: '1', comment: 'Y' },
      ]);
    });
  });

  describe('transactions', () => {
    it('rolls every write back when the callback throws', () => {
      expect(() =>
        transact((tx) => {
          insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A }, tx);
          writeAdmissionValues(
            { encounterUuid: ENC, ...CREW, values: { [OBS_BED_NUMBER]: 'bed-7' } },
            tx,
          );
          throw new Error('boom');
        }, db),
      ).toThrow('boom');

      expect(rows()).toEqual([]);
    });

    it('commits the whole unit when it does not', () => {
      transact((tx) => {
        insert({ encounteruuid: ENC, conceptuuid: CONCEPT_A }, tx);
        insertEncounterType({ encounterUuid: ENC, value: 'SOS', ...CREW }, tx);
      }, db);

      expect(rows()).toHaveLength(2);
    });
  });
});
