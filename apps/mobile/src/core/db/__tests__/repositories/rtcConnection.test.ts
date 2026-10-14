import { findByVisitUuid, insertIfAbsent } from '../../repositories/rtcConnection';
import { rtcConnectionLog } from '../../schema';
import { transact, type DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * First-write-per-visit-wins is ported as-is but is NOT obviously intended for
 * a table named `_log` — the legacy ran its guard and its insert on two
 * different handles, closing one in between, so the check raced and never
 * reliably held. These tests pin the behaviour so changing it is a decision
 * rather than an accident.
 */

describe('rtc connection repository', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  const rows = () => ctx.db.select().from(rtcConnectionLog).all();

  it('keeps the first connection for a visit and rejects later ones', () => {
    expect(
      insertIfAbsent({ uuid: 'r1', visit_uuid: 'v1', connection_info: 'first' }, db),
    ).toBe(true);
    expect(
      insertIfAbsent({ uuid: 'r2', visit_uuid: 'v1', connection_info: 'second' }, db),
    ).toBe(false);

    expect(rows()).toHaveLength(1);
    expect(findByVisitUuid('v1', db)?.connection_info).toBe('first');
  });

  it('keeps separate visits apart', () => {
    insertIfAbsent({ uuid: 'r1', visit_uuid: 'v1', connection_info: 'a' }, db);
    insertIfAbsent({ uuid: 'r2', visit_uuid: 'v2', connection_info: 'b' }, db);

    expect(rows()).toHaveLength(2);
    expect(findByVisitUuid('v2', db)?.connection_info).toBe('b');
  });

  it('returns null for a visit with no connection', () => {
    expect(findByVisitUuid('nope', db)).toBeNull();
  });

  it('does not apply the guard to a row with no visit', () => {
    // The guard is per-visit; a row without one cannot collide with anything.
    expect(insertIfAbsent({ uuid: 'r1', connection_info: 'a' }, db)).toBe(true);
    expect(insertIfAbsent({ uuid: 'r2', connection_info: 'b' }, db)).toBe(true);

    expect(rows()).toHaveLength(2);
  });

  it('treats an empty visit uuid as no visit, not as a key', () => {
    // Pulled rows can carry '' where local writes use NULL. Guarding on ''
    // would make the second of these collide with the first.
    expect(insertIfAbsent({ uuid: 'r1', visit_uuid: '', connection_info: 'a' }, db)).toBe(true);
    expect(insertIfAbsent({ uuid: 'r2', visit_uuid: '', connection_info: 'b' }, db)).toBe(true);

    expect(rows()).toHaveLength(2);
  });

  it('replaces by uuid rather than throwing on a repeat of the same row', () => {
    insertIfAbsent({ uuid: 'r1', visit_uuid: 'v1', connection_info: 'a' }, db);
    insertIfAbsent({ uuid: 'r1', visit_uuid: 'v2', connection_info: 'b' }, db);

    expect(rows()).toHaveLength(1);
    expect(findByVisitUuid('v2', db)?.uuid).toBe('r1');
  });

  it('rolls back inside a failed transaction', () => {
    // The guard reads through the same handle it writes with, so it sees
    // uncommitted rows — which is what makes it hold at all.
    expect(() =>
      transact((tx) => {
        insertIfAbsent({ uuid: 'r1', visit_uuid: 'v1', connection_info: 'a' }, tx);
        expect(insertIfAbsent({ uuid: 'r2', visit_uuid: 'v1', connection_info: 'b' }, tx)).toBe(
          false,
        );
        throw new Error('boom');
      }, db),
    ).toThrow('boom');

    expect(rows()).toEqual([]);
  });
});
