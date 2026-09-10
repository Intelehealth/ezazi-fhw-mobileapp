import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import migrations from '../../../drizzle/migrations';
import { getDb } from './index';
import { appState } from './schema';
import { seedUuidDictionary } from './seeds/uuidDictionary';

/** `tbl_app_state` is a single row, always this id. */
export const APP_STATE_ID = 1;

let inFlight: Promise<void> | null = null;

/**
 * Phase A — bring the local schema up to date.
 *
 * Runs the generated `drizzle/*.sql` migrations, then the static reference
 * seeds, then guarantees the single `tbl_app_state` row exists. Drizzle does
 * NOT create tables implicitly, so without this the database file is empty and
 * the first query fails with `no such table`.
 *
 * Called after authentication, never at app boot — the database must not exist
 * for a logged-out user (ARCHITECTURE_RULES §6 "DB lifecycle").
 *
 * Idempotent and cheap to re-call: Drizzle's journal skips applied migrations,
 * the seed is `onConflictDoNothing`, and the state row insert is too. Safe to
 * call on every login and on every relaunch.
 *
 * Concurrent callers share one promise (a screen remounting must not start a
 * second migration run). A failure is NOT cached — the next call retries.
 */
export function ensureSchema(): Promise<void> {
  if (!inFlight) {
    inFlight = runSchemaInit().catch((error: unknown) => {
      inFlight = null;
      throw error;
    });
  }
  return inFlight;
}

/**
 * Forget that schema init ran. Logout deletes the database file, so the next
 * login must be able to re-create it from scratch; teardown MUST call this
 * alongside `resetDbHandle()`.
 */
export function resetSchemaInit(): void {
  inFlight = null;
}

async function runSchemaInit(): Promise<void> {
  const db = getDb();

  // 1. Structure: tables (0000) + indexes (0001) + app state (0002).
  await migrate(db, migrations);

  // 2. Static reference data that ships with the app, not synced clinical data.
  await seedUuidDictionary();

  // 3. Bookkeeping row, so the hydration resolver always has something to read.
  await db.insert(appState).values({ id: APP_STATE_ID }).onConflictDoNothing();
}
