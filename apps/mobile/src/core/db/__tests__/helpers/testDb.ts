import { drizzle, type SQLJsDatabase } from 'drizzle-orm/sql-js';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';

import migrations from '../../../../../drizzle/migrations';
import { schema } from '../../schema';

/**
 * In-memory SQLite for jest. The device engine is expo-sqlite, which cannot
 * load in Node, so tests run the same SQLite compiled to WASM. Structure comes
 * from the shipped `drizzle/` bundle, never a hand-written CREATE TABLE — a
 * test therefore fails when the migrations drift from `schema.ts`.
 */
export interface TestDb {
  db: SQLJsDatabase<typeof schema>;
  /** Raw handle, for PRAGMA and sqlite_master assertions. */
  client: Database;
  close: () => void;
}

let engine: SqlJsStatic | null = null;

/** Applies every journal entry in order, exactly as `ensureSchema` does on device. */
function applyMigrations(client: Database): void {
  const files = migrations.migrations as Record<string, string>;

  for (const entry of migrations.journal.entries) {
    const sql = files[`m${String(entry.idx).padStart(4, '0')}`];
    if (!sql) throw new Error(`drizzle journal lists ${entry.tag} but no SQL was bundled`);
    client.run(sql);
  }
}

/**
 * Restores the result mapper that drizzle-orm 0.45.2's sql-js driver drops.
 * Its `prepareQuery` declares four parameters, so the mapper passed as the
 * fifth is discarded and `with:` returns child rows as an unparsed JSON string.
 * expo-sqlite forwards it, so the device is unaffected — delete this on upgrade.
 */
function restoreRelationalMapper(db: SQLJsDatabase<typeof schema>): void {
  const session = (db as unknown as { session: Record<string, unknown> }).session;
  const original = (session.prepareQuery as (...args: unknown[]) => Record<string, unknown>).bind(
    session,
  );

  session.prepareQuery = (
    query: unknown,
    fields: unknown,
    executeMethod: unknown,
    isInArrayMode: unknown,
    customResultMapper?: unknown,
  ) => {
    const prepared = original(query, fields, executeMethod, isInArrayMode);
    if (customResultMapper) prepared.customResultMapper = customResultMapper;
    return prepared;
  };
}

/**
 * A migrated, empty database. Each call is isolated — no file, no shared state.
 * Compiling SQLite is slow, so the engine is cached per worker; the database is
 * not. Call `close()` in `afterEach` or the WASM heap grows across tests.
 */
export async function createTestDb(): Promise<TestDb> {
  engine ??= await initSqlJs();

  const client = new engine.Database();
  applyMigrations(client);

  const db = drizzle(client, { schema });
  restoreRelationalMapper(db);

  return { db, client, close: () => client.close() };
}
