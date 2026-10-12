import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';

import { APP_STATE_ID, ensureSchema, resetSchemaInit } from '../init';
import { schema } from '../schema';

/**
 * `ensureSchema` needs no expo-sqlite harness — the migrator works at the
 * dialect level, so pointing `getDb` at the sql.js engine is enough. These
 * cover the memoisation contract, which is what logout and a remounting
 * screen depend on, not that the tables appear.
 */

// Swapped per test so a call can be pointed at a different database.
let mockDb: unknown;

// Forces getDb to throw, to prove a failure is not cached.
let mockFail = false;

// Counts real work: runSchemaInit and the seed each call getDb once.
let mockGetDbCalls = 0;

jest.mock('../index', () => ({
  getDb: () => {
    mockGetDbCalls += 1;
    if (mockFail) throw new Error('db unavailable');
    return mockDb;
  },
}));

let engine: SqlJsStatic;

// One scalar out of a raw query, 0 when the table is absent.
const count = (client: Database, sql: string): number => {
  try {
    return Number(client.exec(sql)[0]?.values[0][0] ?? 0);
  } catch {
    return 0;
  }
};

const tables = (client: Database) =>
  count(client, "SELECT count(*) FROM sqlite_master WHERE type='table'");
const stateRows = (client: Database) => count(client, 'SELECT count(*) FROM tbl_app_state');
const journal = (client: Database) => count(client, 'SELECT count(*) FROM __drizzle_migrations');

// A fresh empty database, wired up the way the app wires its own.
const freshDb = () => {
  const client = new engine.Database();
  mockDb = drizzle(client, { schema });
  return client;
};

describe('ensureSchema', () => {
  let client: Database;

  beforeAll(async () => {
    engine = await initSqlJs();
  });

  // Reset both the module memo and the database, or tests leak into each other.
  beforeEach(() => {
    mockFail = false;
    mockGetDbCalls = 0;
    resetSchemaInit();
    client = freshDb();
  });

  afterEach(() => client.close());

  describe('first run', () => {
    it('applies migrations and the state row', async () => {
      // The device reported 18 tables and 96 seed rows on 2026-10-10. Both
      // changed on 2026-10-12: tbl_uuid_dictionary was dropped (migration
      // 0001), so there is one table fewer and no seeding at all. Encounter
      // type names live in constants/encounter now.
      await ensureSchema();

      expect(tables(client)).toBe(17);
      expect(stateRows(client)).toBe(1);
      expect(journal(client)).toBe(2);
    });

    it('writes the state row under the id the hydration resolver reads', async () => {
      await ensureSchema();

      const [[id, hydration]] = client.exec('SELECT id, hydration_state FROM tbl_app_state')[0]
        .values;
      expect(id).toBe(APP_STATE_ID);
      expect(hydration).toBe('pending');
    });
  });

  describe('running twice', () => {
    // Re-runs against the SAME database, which is what a relaunch does.
    beforeEach(async () => {
      await ensureSchema();
      resetSchemaInit();
      await ensureSchema();
    });

    it('does not duplicate the state row', () => {
      expect(stateRows(client)).toBe(1);
    });

    it('does not re-apply migrations', () => {
      expect(journal(client)).toBe(2);
    });
  });

  describe('memoisation', () => {
    it('hands concurrent callers the same promise', async () => {
      // A screen remounting mid-init must not start a second migration.
      const first = ensureSchema();
      const second = ensureSchema();

      expect(first).toBe(second);
      await Promise.all([first, second]);
      // ONE handle fetch, not one per caller. Was 2 until 2026-10-12, because
      // seedUuidDictionary() fetched its own; that seeding is gone.
      expect(mockGetDbCalls).toBe(1);
    });

    it('does no work again until resetSchemaInit is called', async () => {
      await ensureSchema();

      // Point at a second, empty database and call again.
      const other = freshDb();
      await ensureSchema();
      expect(tables(other)).toBe(0);

      // Only now may the work run, which is what logout then login does.
      resetSchemaInit();
      await ensureSchema();
      expect(tables(other)).toBe(17);
      other.close();
    });
  });

  describe('failure', () => {
    it('is not cached — the next call retries', async () => {
      mockFail = true;
      await expect(ensureSchema()).rejects.toThrow('db unavailable');

      // A cached rejection would brick init for the whole process.
      mockFail = false;
      await expect(ensureSchema()).resolves.toBeUndefined();
      expect(tables(client)).toBe(17);
    });
  });
});
