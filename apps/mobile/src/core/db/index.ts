import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { schema } from './schema';

/**
 * The offline store (replaces the WatermelonDB `localrecords` database).
 *
 * Opened **lazily**, never at import time. The database must not exist for a
 * logged-out user (ARCHITECTURE_RULES §6 "DB lifecycle"), so importing this
 * module has no side effect — only calling `getDb()` creates/opens the file.
 *
 * `enableChangeListener: true` is REQUIRED or Drizzle's `useLiveQuery` never
 * updates. Reactive reads *outside* React (the sync engine, stores) must use
 * `addDatabaseChangeListener` on the raw handle instead of `useLiveQuery`.
 */
export const DATABASE_NAME = 'localrecords.db';

function createOrm(raw: SQLiteDatabase) {
  return drizzle(raw, { schema });
}

let rawHandle: SQLiteDatabase | null = null;
let ormHandle: ReturnType<typeof createOrm> | null = null;

/** The Drizzle database. Opens the file on first call, memoised thereafter. */
export function getDb(): ReturnType<typeof createOrm> {
  if (!ormHandle) {
    rawHandle = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
    ormHandle = createOrm(rawHandle);
  }
  return ormHandle;
}

/**
 * The raw expo-sqlite handle — only for `addDatabaseChangeListener` and for
 * closing the connection during logout teardown. Prefer `getDb()` everywhere else.
 */
export function getRawDb(): SQLiteDatabase {
  if (!rawHandle) getDb();
  return rawHandle as SQLiteDatabase;
}

/** Whether the database has actually been opened in this process. */
export function isDbOpen(): boolean {
  return ormHandle !== null;
}

/**
 * Discard the memoised handles.
 *
 * Logout deletes the `.db` file, after which any retained handle points at a
 * deleted file and every later query fails. Teardown MUST call this after
 * closing the connection.
 */
export function resetDbHandle(): void {
  rawHandle = null;
  ormHandle = null;
}

export { schema };
