import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import { getDb } from './index';
import type { schemaRelations } from './relations';
import type { schema } from './schema';

type FullSchema = typeof schema & typeof schemaRelations;

/**
 * A database handle OR a transaction. Every repository function takes one as
 * its LAST and REQUIRED parameter, so the same function works standalone and
 * composed inside a transaction — and forgetting to pass the transaction is a
 * compile error rather than a silent write outside it.
 * The run result is left open on purpose: expo-sqlite returns `SQLiteRunResult`,
 * the sql.js test engine returns `void`, and pinning either breaks the other.
 */
export type DbHandle = BaseSQLiteDatabase<'sync', unknown, FullSchema>;

/** Rejects an async callback at compile time — see `transact`. */
type Synchronous<T> = T extends Promise<unknown> ? never : T;

/**
 * Runs `fn` in one transaction, rolling back if it throws. Pass `on` a
 * transaction to nest — drizzle issues a SAVEPOINT rather than a second BEGIN.
 *
 * The callback MUST be synchronous. Both drivers are `'sync'`, so drizzle runs
 * COMMIT the moment `fn` returns; an async callback returns a promise
 * immediately, the writes land after COMMIT, and a rejection never rolls back.
 * `Synchronous<T>` makes that shape fail to compile instead.
 */
export function transact<T>(fn: (tx: DbHandle) => Synchronous<T>, on?: DbHandle): T {
  const handle = on ?? getDb();
  return handle.transaction(fn as (tx: DbHandle) => T);
}
