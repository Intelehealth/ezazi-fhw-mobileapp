import { APP_STATE_ID } from '../../init';
import {
  getPullCursor,
  hasNeverPulled,
  PULL_EPOCH,
  setPullCursor,
} from '../../repositories/appState';
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

  it('exports the sentinel the column defaults to, character for character', () => {
    // Including the trailing space: it goes straight into the pull URL.
    expect(PULL_EPOCH).toBe(EPOCH);
  });

  describe('hasNeverPulled', () => {
    it('is true on a fresh install', () => {
      expect(hasNeverPulled(db)).toBe(true);
    });

    it('is false once a pull has moved the cursor', () => {
      setPullCursor(RETURNED, db);

      expect(hasNeverPulled(db)).toBe(false);
    });

    it('stays true when an apply rolled back', () => {
      // The archive must be redone, not skipped: the cursor and the rows move
      // in one transaction, so a rollback means nothing landed.
      expect(() =>
        transact((tx) => {
          setPullCursor(RETURNED, tx);
          throw new Error('apply failed');
        }, db),
      ).toThrow('apply failed');

      expect(hasNeverPulled(db)).toBe(true);
    });

    it('is true when the bookkeeping row is missing, not a second kind of empty', () => {
      // Reachable only before ensureSchema. The honest answer is still
      // "nothing has been pulled" — getPullCursor used to return '' here,
      // which gave that state two spellings.
      db.delete(appState).run();

      expect(getPullCursor(db)).toBe(EPOCH);
      expect(hasNeverPulled(db)).toBe(true);
    });
  });
});
