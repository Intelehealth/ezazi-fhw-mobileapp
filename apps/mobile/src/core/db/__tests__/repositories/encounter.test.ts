import { eq } from 'drizzle-orm';

import {
  DELIVERY_OUTCOME_STAGE3,
  ENCOUNTER_ADMISSION,
  ENCOUNTER_VITALS,
  LCG_SOS,
  STAGE3_HOUR1_1,
} from '../../constants/encounter';
import {
  existsByVisitAndType,
  findAll,
  findByVisit,
  findCurrentStageName,
  findLatestClinicalByVisit,
  findLatestEncounterTypeName,
  findLatestSosByVisit,
  findTimelineByVisit,
  findUnsynced,
  findTypeNameByUuid,
  findUuidByVisitAndType,
  findVisitCompleteUuid,
  insertAdmission,
  insertDeliveryOutcomeStage3,
  insertManyReplacing,
  insertSos,
  insertVisitComplete,
  isStage3Started,
  markDirty,
  markSynced,
  upsert,
  upsertMany,
} from '../../repositories/encounter';
import { encounter, uuidDictionary } from '../../schema';
import { SYNC_CLEAN, SYNC_DIRTY, VOIDED_YES } from '../../syncFlags';
import { transact, type DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * The dedupe path above all — the legacy looked an encounter up by
 * (visit, type) and then updated by the INCOMING uuid, so a mismatch dropped
 * the encounter silently. Also the three behavioural asymmetries that were
 * preserved rather than tidied away.
 */

const VISIT = 'v1';

describe('encounter repository', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  const rows = () => ctx.db.select().from(encounter).all();
  const row = (uuid: string) =>
    ctx.db.select().from(encounter).where(eq(encounter.uuid, uuid)).get();

  describe('dedupe by visit and type', () => {
    it('updates the EXISTING row when the incoming uuid differs', () => {
      // The legacy updated by the incoming uuid, matched zero rows, and lost
      // the encounter without error. This is the bug, not a style preference.
      upsert({ uuid: 'first', visituuid: VISIT, encounter_type_uuid: ENCOUNTER_VITALS }, db);
      upsert(
        {
          uuid: 'second',
          visituuid: VISIT,
          encounter_type_uuid: ENCOUNTER_VITALS,
          provider_uuid: 'dr-1',
        },
        db,
      );

      expect(rows()).toHaveLength(1);
      expect(row('first')).toMatchObject({ provider_uuid: 'dr-1' });
      expect(row('second')).toBeUndefined();
    });

    it('treats a voided encounter of that type as still present', () => {
      // No voided filter on the dedupe lookup, unlike findUuidByVisitAndType.
      upsert(
        {
          uuid: 'first',
          visituuid: VISIT,
          encounter_type_uuid: ENCOUNTER_VITALS,
          voided: VOIDED_YES,
        },
        db,
      );
      upsert({ uuid: 'second', visituuid: VISIT, encounter_type_uuid: ENCOUNTER_VITALS }, db);

      expect(rows()).toHaveLength(1);
    });

    it('never dedupes SOS — a visit may carry many', () => {
      insertSos({ uuid: 's1', visituuid: VISIT }, db);
      insertSos({ uuid: 's2', visituuid: VISIT }, db);

      expect(rows()).toHaveLength(2);
    });

    it('never dedupes SOS on the upsert path either', () => {
      // insertSos bypasses writeOne, so only this exercises the guard inside
      // it — the path a pulled SOS row takes.
      upsert({ uuid: 's1', visituuid: VISIT, encounter_type_uuid: LCG_SOS }, db);
      upsert({ uuid: 's2', visituuid: VISIT, encounter_type_uuid: LCG_SOS }, db);

      expect(rows()).toHaveLength(2);
    });

    it('keeps encounters of different types apart', () => {
      upsert({ uuid: 'e1', visituuid: VISIT, encounter_type_uuid: ENCOUNTER_VITALS }, db);
      upsert({ uuid: 'e2', visituuid: VISIT, encounter_type_uuid: ENCOUNTER_ADMISSION }, db);

      expect(rows()).toHaveLength(2);
    });

    it('keeps the same type on different visits apart', () => {
      upsert({ uuid: 'e1', visituuid: VISIT, encounter_type_uuid: ENCOUNTER_VITALS }, db);
      upsert({ uuid: 'e2', visituuid: 'v2', encounter_type_uuid: ENCOUNTER_VITALS }, db);

      expect(rows()).toHaveLength(2);
    });

    it('insertManyReplacing skips the dedupe entirely', () => {
      // Semantically different from upsertMany: always replaces by uuid.
      insertManyReplacing(
        [
          { uuid: 'e1', visituuid: VISIT, encounter_type_uuid: ENCOUNTER_VITALS },
          { uuid: 'e2', visituuid: VISIT, encounter_type_uuid: ENCOUNTER_VITALS },
        ],
        db,
      );

      expect(rows()).toHaveLength(2);
    });
  });

  describe('typed writes', () => {
    it('creates the admission encounter the obs hang off', () => {
      insertAdmission(
        { uuid: 'a1', visitUuid: VISIT, providerUuid: 'dr-1', encounterTime: '2026-01-01' },
        db,
      );

      expect(row('a1')).toMatchObject({
        encounter_type_uuid: ENCOUNTER_ADMISSION,
        sync: SYNC_DIRTY,
      });
    });

    it('marks a visit complete', () => {
      insertVisitComplete(
        { uuid: 'c1', visitUuid: VISIT, providerUuid: 'dr-1', encounterTime: '2026-01-01' },
        db,
      );

      expect(findVisitCompleteUuid(VISIT, db)).toBe('c1');
    });

    it('stamps the stage-3 delivery outcome type', () => {
      insertDeliveryOutcomeStage3({ uuid: 'd1', visituuid: VISIT }, db);

      expect(row('d1')?.encounter_type_uuid).toBe(DELIVERY_OUTCOME_STAGE3);
    });

    it('writes pulled rows clean and local rows dirty', () => {
      upsertMany([{ uuid: 'pulled', visituuid: VISIT, encounter_type_uuid: ENCOUNTER_VITALS }], db);
      upsert({ uuid: 'local', visituuid: 'v2', encounter_type_uuid: ENCOUNTER_VITALS }, db);
      markDirty('local', db);

      expect(row('pulled')?.sync).toBe(SYNC_CLEAN);
      expect(row('local')?.sync).toBe(SYNC_DIRTY);
    });

    it('round-trips the dirty flag', () => {
      upsert({ uuid: 'e1', visituuid: VISIT, encounter_type_uuid: ENCOUNTER_VITALS }, db);
      markSynced('e1', db);
      expect(row('e1')?.sync).toBe(SYNC_CLEAN);

      markDirty('e1', db);
      expect(row('e1')?.sync).toBe(SYNC_DIRTY);
    });
  });

  describe('lookups', () => {
    it('findUuidByVisitAndType SKIPS voided rows, unlike the dedupe check', () => {
      // The asymmetry is deliberate; both call sites depend on their own half.
      upsert(
        {
          uuid: 'e1',
          visituuid: VISIT,
          encounter_type_uuid: ENCOUNTER_VITALS,
          voided: VOIDED_YES,
        },
        db,
      );

      expect(existsByVisitAndType(VISIT, ENCOUNTER_VITALS, db)).toBe(true);
      expect(findUuidByVisitAndType(VISIT, ENCOUNTER_VITALS, db)).toBeNull();
    });

    it('reads visit-complete without a voided filter', () => {
      insertVisitComplete(
        { uuid: 'c1', visitUuid: VISIT, providerUuid: 'dr-1', encounterTime: '2026-01-01' },
        db,
      );
      ctx.db.update(encounter).set({ voided: VOIDED_YES }).where(eq(encounter.uuid, 'c1')).run();

      // A voided completion encounter still reads as completed. Legacy behaviour.
      expect(findVisitCompleteUuid(VISIT, db)).toBe('c1');
    });

    it('detects stage 3 by its first encounter', () => {
      expect(isStage3Started(VISIT, db)).toBe(false);
      upsert({ uuid: 'e1', visituuid: VISIT, encounter_type_uuid: STAGE3_HOUR1_1 }, db);

      expect(isStage3Started(VISIT, db)).toBe(true);
    });

    it('finds the latest SOS, newest first', () => {
      insertSos({ uuid: 's1', visituuid: VISIT, encounter_time: '2026-01-01' }, db);
      insertSos({ uuid: 's2', visituuid: VISIT, encounter_time: '2026-06-01' }, db);

      expect(findLatestSosByVisit(VISIT, db)?.uuid).toBe('s2');
    });
  });

  describe('timeline reads', () => {
    const seedTimeline = () => {
      upsert(
        {
          uuid: 'vitals',
          visituuid: VISIT,
          encounter_type_uuid: ENCOUNTER_VITALS,
          encounter_time: '2026-01-02',
        },
        db,
      );
      insertAdmission(
        { uuid: 'adm', visitUuid: VISIT, providerUuid: 'dr-1', encounterTime: '2026-01-01' },
        db,
      );
      insertVisitComplete(
        { uuid: 'done', visitUuid: VISIT, providerUuid: 'dr-1', encounterTime: '2026-01-03' },
        db,
      );
      insertSos({ uuid: 'sos', visituuid: VISIT, encounter_time: '2026-01-04' }, db);
    };

    it('hides the bookkeeping encounters from the timeline, ascending', () => {
      seedTimeline();

      expect(findTimelineByVisit(VISIT, db).map((e) => e.uuid)).toEqual(['vitals', 'sos']);
    });

    it('excludes all three bookkeeping types from the latest clinical encounter', () => {
      // SOS is newest, but it is not a clinical encounter.
      seedTimeline();

      expect(findLatestClinicalByVisit(VISIT, db)?.uuid).toBe('vitals');
    });

    it('returns null when a visit has only bookkeeping encounters', () => {
      insertAdmission(
        { uuid: 'adm', visitUuid: VISIT, providerUuid: 'dr-1', encounterTime: '2026-01-01' },
        db,
      );

      expect(findLatestClinicalByVisit(VISIT, db)).toBeNull();
    });

    it('findByVisit keeps the bookkeeping rows and sorts newest first', () => {
      // Deliberately different from findTimelineByVisit; both are live.
      seedTimeline();

      expect(findByVisit(VISIT, db).map((e) => e.uuid)).toEqual([
        'sos',
        'done',
        'vitals',
        'adm',
      ]);
    });

    it('skips voided rows in the timeline', () => {
      seedTimeline();
      ctx.db.update(encounter).set({ voided: VOIDED_YES }).where(eq(encounter.uuid, 'vitals')).run();

      expect(findTimelineByVisit(VISIT, db).map((e) => e.uuid)).toEqual(['sos']);
    });
  });

  describe('dirty read', () => {
    it('excludes typeless encounters, which cannot be pushed', () => {
      upsert({ uuid: 'typed', visituuid: VISIT, encounter_type_uuid: ENCOUNTER_VITALS }, db);
      markDirty('typed', db);
      ctx.db.insert(encounter).values({ uuid: 'typeless', visituuid: VISIT }).run();
      ctx.db.insert(encounter).values({ uuid: 'blank', visituuid: VISIT, encounter_type_uuid: '' }).run();

      expect(findUnsynced(db).map((e) => e.uuid)).toEqual(['typed']);
    });

    it('orders findAll newest first', () => {
      upsert({ uuid: 'old', visituuid: VISIT, encounter_type_uuid: ENCOUNTER_VITALS, encounter_time: '2026-01-01' }, db);
      upsert({ uuid: 'new', visituuid: 'v2', encounter_type_uuid: ENCOUNTER_VITALS, encounter_time: '2026-06-01' }, db);

      expect(findAll(db).map((e) => e.uuid)).toEqual(['new', 'old']);
    });
  });

  describe('stage names via the dictionary', () => {
    beforeEach(() => {
      ctx.db
        .insert(uuidDictionary)
        .values([
          { uuid: 'type-a', name: 'Stage2_Hr9_1' },
          { uuid: 'type-b', name: 'Stage2_Hr10_1' },
        ])
        .run();
    });

    it('sorts stage names LEXICOGRAPHICALLY, so Hr9 outranks Hr10', () => {
      // Ported verbatim. Changing it to encounter_time changes app behaviour.
      upsert({ uuid: 'e1', visituuid: VISIT, encounter_type_uuid: 'type-a' }, db);
      upsert({ uuid: 'e2', visituuid: VISIT, encounter_type_uuid: 'type-b' }, db);

      expect(findCurrentStageName(VISIT, db)).toBe('Stage2_Hr9_1');
    });

    it('returns the latest type name, SOS included', () => {
      // No voided filter and no SOS exclusion here, unlike the clinical read.
      upsert({ uuid: 'e1', visituuid: VISIT, encounter_type_uuid: 'type-a', encounter_time: '2026-01-01' }, db);
      ctx.db.insert(uuidDictionary).values({ uuid: LCG_SOS, name: 'LCG_SOS' }).run();
      insertSos({ uuid: 's1', visituuid: VISIT, encounter_time: '2026-06-01' }, db);

      expect(findLatestEncounterTypeName(VISIT, db)).toBe('LCG_SOS');
    });

    it('returns null when the type is not in the dictionary', () => {
      upsert({ uuid: 'e1', visituuid: VISIT, encounter_type_uuid: 'unknown-type' }, db);

      expect(findCurrentStageName(VISIT, db)).toBeNull();
    });
  });

  it('rolls back the admission encounter with the rest of its transaction', () => {
    expect(() =>
      transact((tx) => {
        insertAdmission(
          { uuid: 'a1', visitUuid: VISIT, providerUuid: 'dr-1', encounterTime: '2026-01-01' },
          tx,
        );
        throw new Error('obs write failed');
      }, db),
    ).toThrow('obs write failed');

    expect(rows()).toEqual([]);
  });

  describe('type name lookup', () => {
    it('returns the structured code callers parse for stage and hour', () => {
      ctx.db
        .insert(uuidDictionary)
        .values({ uuid: 'type-1', name: 'Stage1_Hour1_1' })
        .run();

      expect(findTypeNameByUuid('type-1', db)).toBe('Stage1_Hour1_1');
    });

    it('returns null for a uuid the dictionary does not hold', () => {
      expect(findTypeNameByUuid('missing', db)).toBeNull();
    });
  });
});
