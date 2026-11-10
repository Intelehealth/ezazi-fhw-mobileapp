import { APP_STATE_ID } from '../../init';
import { getPullCursor, setPullCursor } from '../../repositories/appState';
import { appState } from '../../schema';
import { transact, type DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * The pull cursor. The test that matters is the last one: the cursor must never
 * survive a failed apply, or the next pull asks for changes after a point whose
 * rows never landed and those records are skipped permanently.
 */

const EPOCH = '2006-08-22 22:21:48 ';
const RETURNED = '2026-11-10 06:30:00 ';

describe('appState repository', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
    // `ensureSchema` seeds this row on a device; the test harness does not.
    db.insert(appState).values({ id: APP_STATE_ID }).run();
  });

  afterEach(() => ctx.close());

  it('starts at the 2006 sentinel, which asks the server for everything', () => {
    expect(getPullCursor(db)).toBe(EPOCH);
  });

  it('round-trips the cursor the server returned', () => {
    setPullCursor(RETURNED, db);

    expect(getPullCursor(db)).toBe(RETURNED);
  });

  it('rolls the cursor back with its transaction — it must never outrun the data', () => {
    expect(() =>
      transact((tx) => {
        setPullCursor(RETURNED, tx);
        throw new Error('apply failed');
      }, db),
    ).toThrow('apply failed');

    expect(getPullCursor(db)).toBe(EPOCH);
  });
});
