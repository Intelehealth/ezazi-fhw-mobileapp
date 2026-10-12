import { findAll, findByUuid, replaceAllFromPull } from '../../repositories/location';
import { location } from '../../schema';
import { SYNC_CLEAN, VOIDED_NO } from '../../syncFlags';
import type { DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * `tbl_location` is write-only in the app, so these tests mostly pin the two
 * legacy details that were fixed rather than ported: a device-clock
 * `modified_date` that defeated the change detection it existed for, and a
 * `sync` written as the string 'TRUE' against a 'false' default.
 */

describe('location repository', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  const rows = () => ctx.db.select().from(location).all();

  it("keeps the server's modified_date rather than stamping the device clock", () => {
    replaceAllFromPull([{ locationuuid: 'l1', name: 'Alpha', modified_date: '2020-01-01' }], db);

    expect(findByUuid('l1', db)?.modified_date).toBe('2020-01-01');
  });

  it('writes every row clean — nothing pushes locations', () => {
    replaceAllFromPull([{ locationuuid: 'l1', name: 'Alpha' }], db);

    expect(rows()[0].sync).toBe(SYNC_CLEAN);
  });

  it('keys on locationuuid, not a uuid column', () => {
    replaceAllFromPull([{ locationuuid: 'l1', name: 'Alpha' }], db);
    replaceAllFromPull([{ locationuuid: 'l1', name: 'Renamed' }], db);

    expect(rows()).toHaveLength(1);
    expect(findByUuid('l1', db)?.name).toBe('Renamed');
  });

  it('updates by explicit column set, so an omitted column is not reset', () => {
    replaceAllFromPull([{ locationuuid: 'l1', name: 'Alpha', retired: 1 }], db);
    replaceAllFromPull([{ locationuuid: 'l1', name: 'Alpha', retired: 1, voided: VOIDED_NO }], db);

    expect(findByUuid('l1', db)).toMatchObject({ retired: 1, voided: VOIDED_NO });
  });

  it('writes a whole batch', () => {
    replaceAllFromPull(
      [
        { locationuuid: 'l1', name: 'Alpha' },
        { locationuuid: 'l2', name: 'Beta' },
        { locationuuid: 'l3', name: 'Gamma' },
      ],
      db,
    );

    expect(rows()).toHaveLength(3);
  });

  it('lists by NAME, not by uuid', () => {
    // The uuids deliberately sort opposite to the names, or this assertion
    // would pass just as well on an unordered or uuid-ordered query.
    replaceAllFromPull(
      [
        { locationuuid: 'l1', name: 'Zeta' },
        { locationuuid: 'l2', name: 'Alpha' },
      ],
      db,
    );

    expect(findAll(db).map((r) => r.name)).toEqual(['Alpha', 'Zeta']);
    expect(findAll(db).map((r) => r.locationuuid)).toEqual(['l2', 'l1']);
  });

  it('misses cleanly', () => {
    expect(findByUuid('nope', db)).toBeNull();
  });
});
