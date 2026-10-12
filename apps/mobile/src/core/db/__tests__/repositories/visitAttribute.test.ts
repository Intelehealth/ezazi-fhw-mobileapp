import { eq } from 'drizzle-orm';

import { VISIT_READ_STATUS_VALUE } from '../../constants/literals';
import {
  DECISION_PENDING,
  VISIT_DR_SPECIALITY,
  VISIT_HOLDER,
  VISIT_READ_STATUS,
  VISIT_RISK,
} from '../../constants/visit';
import {
  assignHolder,
  findDirty,
  findValue,
  hasValue,
  insertLocal,
  listByVisit,
  markRead,
  updateValue,
  upsertLocal,
  upsertManyFromPull,
  type PulledVisitAttribute,
} from '../../repositories/visitAttribute';
import { visitAttribute } from '../../schema';
import { SYNC_CLEAN, SYNC_DIRTY, VOIDED_NO, VOIDED_YES } from '../../syncFlags';
import type { DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * Identity here is the (visit, type) PAIR, not the row uuid, and most of these
 * tests pin that. The rest guard three changes: skipped pull types are reported
 * rather than dropped silently, a no-op write cannot flip the dirty flag, and
 * an update that matched nothing is distinguishable from a failure.
 */

const VISIT = 'v1';

describe('visit attribute repository', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  const rows = () => ctx.db.select().from(visitAttribute).all();
  const row = (uuid: string) =>
    ctx.db.select().from(visitAttribute).where(eq(visitAttribute.uuid, uuid)).get();

  const pulled = (
    uuid: string,
    visit_attribute_type_uuid: string,
    value: string,
    voided = VOIDED_NO,
  ): PulledVisitAttribute => ({
    uuid,
    visit_uuid: VISIT,
    visit_attribute_type_uuid,
    value,
    voided,
  });

  describe('the pull', () => {
    it('writes accepted rows clean and reports the types it skipped', () => {
      const result = upsertManyFromPull(
        [
          pulled('s1', VISIT_HOLDER, 'nurse-1'),
          pulled('s2', 'some-future-type', 'x'),
          pulled('s3', VISIT_RISK, '3'),
        ],
        db,
      );

      expect(result).toEqual({ written: 2, skipped: ['some-future-type'] });
      expect(rows().every((r) => r.sync === SYNC_CLEAN)).toBe(true);
      expect(rows()).toHaveLength(2);
    });

    it('accepts all five whitelisted types and nothing else', () => {
      const result = upsertManyFromPull(
        [
          pulled('s1', VISIT_HOLDER, 'a'),
          pulled('s2', VISIT_DR_SPECIALITY, 'b'),
          pulled('s3', VISIT_READ_STATUS, 'c'),
          pulled('s4', DECISION_PENDING, 'd'),
          pulled('s5', VISIT_RISK, 'e'),
          pulled('s6', 'rejected', 'f'),
        ],
        db,
      );

      expect(result.written).toBe(5);
      expect(result.skipped).toEqual(['rejected']);
    });

    it('updates the existing row for a pair instead of adding a second', () => {
      upsertManyFromPull([pulled('s1', VISIT_HOLDER, 'nurse-1')], db);
      upsertManyFromPull([pulled('s2', VISIT_HOLDER, 'nurse-2')], db);

      expect(rows()).toHaveLength(1);
      expect(findValue(VISIT, VISIT_HOLDER, db)).toBe('nurse-2');
    });

    it('keeps the LOCAL uuid when the server sends a different one', () => {
      // Deliberate, and the legacy's choice: matching on the pair avoids a
      // duplicate row, at the cost of the uuid diverging from the server's.
      const local = insertLocal(VISIT, VISIT_HOLDER, 'nurse-1', db);
      upsertManyFromPull([pulled('server-uuid', VISIT_HOLDER, 'nurse-2')], db);

      expect(rows()).toHaveLength(1);
      expect(row(local)?.value).toBe('nurse-2');
      expect(row('server-uuid')).toBeUndefined();
    });

    it('marks a locally-created row clean once the server confirms it', () => {
      insertLocal(VISIT, VISIT_HOLDER, 'nurse-1', db);
      expect(rows()[0].sync).toBe(SYNC_DIRTY);

      upsertManyFromPull([pulled('s1', VISIT_HOLDER, 'nurse-1')], db);
      expect(rows()[0].sync).toBe(SYNC_CLEAN);
    });

    it("carries the server's voided flag through", () => {
      upsertManyFromPull([pulled('s1', VISIT_HOLDER, 'nurse-1')], db);
      upsertManyFromPull([pulled('s1', VISIT_HOLDER, 'nurse-1', VOIDED_YES)], db);

      expect(rows()[0].voided).toBe(VOIDED_YES);
      expect(findValue(VISIT, VISIT_HOLDER, db)).toBeNull();
    });

    it('keeps different visits and different types apart', () => {
      upsertManyFromPull(
        [
          pulled('s1', VISIT_HOLDER, 'a'),
          pulled('s2', VISIT_RISK, 'b'),
          { ...pulled('s3', VISIT_HOLDER, 'c'), visit_uuid: 'v2' },
        ],
        db,
      );

      expect(rows()).toHaveLength(3);
    });
  });

  describe('local writes', () => {
    it('creates dirty', () => {
      const uuid = insertLocal(VISIT, VISIT_HOLDER, 'nurse-1', db);

      expect(row(uuid)).toMatchObject({
        visit_uuid: VISIT,
        visit_attribute_type_uuid: VISIT_HOLDER,
        value: 'nurse-1',
        voided: VOIDED_NO,
        sync: SYNC_DIRTY,
      });
    });

    it('takes (visit, TYPE, value) — not the legacy (visit, value, type)', () => {
      // Getting this backwards files the four admission attributes under the
      // wrong types, which hides the patient while leaving her visit open.
      insertLocal(VISIT, VISIT_DR_SPECIALITY, 'Obstetrician', db);

      expect(findValue(VISIT, VISIT_DR_SPECIALITY, db)).toBe('Obstetrician');
      expect(findValue(VISIT, 'Obstetrician', db)).toBeNull();
    });

    it('upsertLocal creates the pair when it is missing', () => {
      const uuid = upsertLocal(VISIT, VISIT_RISK, '3', db);

      expect(uuid).toBeTruthy();
      expect(findValue(VISIT, VISIT_RISK, db)).toBe('3');
    });

    it('upsertLocal updates the pair in place', () => {
      upsertLocal(VISIT, VISIT_RISK, '3', db);
      upsertLocal(VISIT, VISIT_RISK, '7', db);

      expect(rows()).toHaveLength(1);
      expect(findValue(VISIT, VISIT_RISK, db)).toBe('7');
    });

    it('upsertLocal does nothing when the value already matches', () => {
      // The guard exists so a no-op cannot flip the dirty flag and schedule a
      // pointless push. The legacy made every call site repeat it by hand.
      upsertManyFromPull([pulled('s1', VISIT_RISK, '3')], db);
      expect(rows()[0].sync).toBe(SYNC_CLEAN);

      expect(upsertLocal(VISIT, VISIT_RISK, '3', db)).toBeNull();
      expect(rows()[0].sync).toBe(SYNC_CLEAN);
    });

    it('upsertLocal DOES flip the flag when the value really changes', () => {
      upsertManyFromPull([pulled('s1', VISIT_RISK, '3')], db);
      upsertLocal(VISIT, VISIT_RISK, '7', db);

      expect(rows()[0].sync).toBe(SYNC_DIRTY);
    });

    it('updates every duplicate row for a pair, leaving none stale', () => {
      // No unique index exists, so duplicates are possible.
      insertLocal(VISIT, VISIT_RISK, 'old', db);
      insertLocal(VISIT, VISIT_RISK, 'old', db);

      updateValue(VISIT, VISIT_RISK, 'new', db);

      expect(rows()).toHaveLength(2);
      expect(rows().every((r) => r.value === 'new')).toBe(true);
    });
  });

  describe('update-only paths', () => {
    it('reports false when the pair has no row, and writes nothing', () => {
      // The legacy swallowed SQL errors and returned 0 either way, so a hard
      // failure looked exactly like 'no such row'.
      expect(updateValue(VISIT, VISIT_RISK, '3', db)).toBe(false);
      expect(rows()).toEqual([]);
    });

    it('assignHolder reassigns the owner and marks it dirty', () => {
      upsertManyFromPull([pulled('s1', VISIT_HOLDER, 'nurse-1')], db);

      expect(assignHolder(VISIT, 'nurse-2', db)).toBe(true);
      expect(findValue(VISIT, VISIT_HOLDER, db)).toBe('nurse-2');
      expect(rows()[0].sync).toBe(SYNC_DIRTY);
    });

    it('assignHolder touches only the holder attribute', () => {
      upsertManyFromPull(
        [pulled('s1', VISIT_HOLDER, 'nurse-1'), pulled('s2', VISIT_RISK, '3')],
        db,
      );
      assignHolder(VISIT, 'nurse-2', db);

      expect(findValue(VISIT, VISIT_RISK, db)).toBe('3');
    });

    it('markRead writes the sentinel, and false when the row is absent', () => {
      expect(markRead(VISIT, db)).toBe(false);

      insertLocal(VISIT, VISIT_READ_STATUS, 'anything', db);
      expect(markRead(VISIT, db)).toBe(true);
      expect(findValue(VISIT, VISIT_READ_STATUS, db)).toBe(VISIT_READ_STATUS_VALUE);
    });

    it('un-voids the row it updates, matching the legacy', () => {
      upsertManyFromPull([pulled('s1', VISIT_RISK, '3', VOIDED_YES)], db);
      updateValue(VISIT, VISIT_RISK, '7', db);

      expect(rows()[0].voided).toBe(VOIDED_NO);
    });
  });

  describe('reads', () => {
    it('findValue and hasValue both skip voided rows', () => {
      upsertManyFromPull([pulled('s1', VISIT_RISK, '3', VOIDED_YES)], db);

      expect(findValue(VISIT, VISIT_RISK, db)).toBeNull();
      expect(hasValue(VISIT, VISIT_RISK, '3', db)).toBe(false);
    });

    it('hasValue matches on the value, not just the pair', () => {
      upsertManyFromPull([pulled('s1', DECISION_PENDING, 'true')], db);

      expect(hasValue(VISIT, DECISION_PENDING, 'true', db)).toBe(true);
      expect(hasValue(VISIT, DECISION_PENDING, 'false', db)).toBe(false);
    });

    it('listByVisit is scoped to the visit and skips voided rows', () => {
      upsertManyFromPull(
        [
          pulled('s1', VISIT_HOLDER, 'a'),
          pulled('s2', VISIT_RISK, 'b', VOIDED_YES),
          { ...pulled('s3', VISIT_HOLDER, 'c'), visit_uuid: 'v2' },
        ],
        db,
      );

      expect(listByVisit(VISIT, db).map((r) => r.uuid)).toEqual(['s1']);
    });

    it('findDirty returns local rows and not pulled ones', () => {
      upsertManyFromPull([pulled('s1', VISIT_HOLDER, 'a')], db);
      const local = insertLocal(VISIT, VISIT_RISK, '3', db);

      expect(findDirty(db).map((r) => r.uuid)).toEqual([local]);
    });

    it('findDirty includes a voided row — it still has to reach the server', () => {
      const uuid = insertLocal(VISIT, VISIT_RISK, '3', db);
      ctx.db
        .update(visitAttribute)
        .set({ voided: VOIDED_YES })
        .where(eq(visitAttribute.uuid, uuid))
        .run();

      expect(findDirty(db).map((r) => r.uuid)).toEqual([uuid]);
    });

    it('findDirty excludes a type outside the pushable set', () => {
      insertLocal(VISIT, 'not-pushable', 'x', db);

      expect(findDirty(db)).toEqual([]);
    });
  });
});
