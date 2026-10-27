import { drizzle } from 'drizzle-orm/expo-sqlite';
import { addDatabaseChangeListener, openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { getTableName, type Table } from 'drizzle-orm';

import { schemaRelations } from './relations';
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
  // Relations are spread in HERE, never imported into schema.ts — that direction
  // is circular. Omit them and `db.query` is silently undefined, not a type error.
  return drizzle(raw, { schema: { ...schema, ...schemaRelations } });
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

// expo-sqlite reports each changed row on its own; one card save changes ~20 rows. Changes this
// close together are answered with a single call.
const TABLE_CHANGE_COALESCE_MS = 50;

/**
 * Calls `listener` once after a burst of writes to any of `tables`; returns the unsubscribe, which
 * also drops a pending call. For reads outside `useLiveQuery`.
 */
export function onTablesChanged(tables: readonly Table[], listener: () => void): () => void {
  const names = new Set(tables.map((table) => getTableName(table)));
  let pending: ReturnType<typeof setTimeout> | null = null;
  const subscription = addDatabaseChangeListener((event) => {
    if (!names.has(event.tableName) || pending) return;
    pending = setTimeout(() => {
      pending = null;
      listener();
    }, TABLE_CHANGE_COALESCE_MS);
  });
  return () => {
    if (pending) clearTimeout(pending);
    subscription.remove();
  };
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
export { schemaRelations } from './relations';
export { SYNC_CLEAN, SYNC_DIRTY, VOIDED_NO, VOIDED_YES } from './syncFlags';
