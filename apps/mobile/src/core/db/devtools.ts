import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';

import type { DbPhase } from '@/core/session/dbBootstrap.store';

import { getRawDb, isDbOpen } from './index';

/**
 * Drizzle Studio — this stack's answer to Android Studio's Database Inspector.
 *
 * App Inspection cannot see `localrecords.db`: it hooks the framework's
 * `android.database.sqlite.SQLiteDatabase`, and expo-sqlite ships its own
 * SQLite and reaches it over JSI, so that class is never touched. This hook is
 * the replacement — open it from the Metro terminal with `shift + m` ->
 * "Drizzle Studio" and it reads the live database out of the running app:
 * tables, rows, and a SQL console.
 *
 * `expo-drizzle-studio-plugin` declares `"platforms": ["devtools"]`. It is a
 * dev-tools-only Expo module with NO native code, so it needs no `prebuild`
 * and no new dev-client build — install, restart Metro, done. (Tripwire 8 does
 * not apply: nothing reaches the Gradle layer.)
 *
 * In a release build `useDevToolsPluginClient` has no dev server to attach to
 * and the hook is already inert; `__DEV__` below states that outright rather
 * than leaning on it.
 */
export function useDbDevTools(_phase: DbPhase): void {
  // The handle must NOT be fetched unconditionally. `getRawDb()` OPENS the
  // file, and the database must not exist for a logged-out user
  // (ARCHITECTURE_RULES §6 "DB lifecycle" · CLAUDE.md tripwire 11) — calling it
  // from the composition root would create `localrecords.db` at boot, which is
  // the precise bug the lazy getter exists to prevent. Attach only to a
  // database something else has already opened.
  //
  // `_phase` is deliberately never read. It is a re-render trigger: `isDbOpen()`
  // is a plain function, not reactive, so this hook has to re-run at a moment
  // when its answer can have changed. The bootstrap phase advancing past
  // 'preparing' IS that moment — `ensureSchema()` has returned by then and the
  // handle exists. Drop the parameter and the studio stays bound to `null` for
  // the whole session with nothing to say why.
  useDrizzleStudio(__DEV__ && isDbOpen() ? getRawDb() : null);
}
