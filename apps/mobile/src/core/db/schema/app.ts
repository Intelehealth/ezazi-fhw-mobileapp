import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Device-local tables. Neither is ever synced.

// Android has no uuid PK here (WatermelonDB auto-generated an id) → synthetic PK.
export const userCredentials = sqliteTable('tbl_user_credentials', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username'),
  password: text('password'),
  creator_uuid_cred: text('creator_uuid_cred'),
  chwname: text('chwname'),
  provider_uuid_cred: text('provider_uuid_cred'),
});

/**
 * Local DB-lifecycle bookkeeping — a single row, always `id = 1`.
 *
 * Never synced (hence no `sync`/`voided` columns), and deliberately NOT the
 * schema version: Drizzle's own journal owns that, so a future migration must
 * never re-trigger hydration. See ARCHITECTURE_RULES §6 "DB lifecycle".
 */
/**
 * The cursor's starting value, and the one value that means "nothing has been
 * pulled yet". The trailing space is deliberate: it goes straight into the
 * pull URL and the legacy sends it exactly this way. Do not trim it.
 *
 * Declared here rather than in the repository so the column default and the
 * "is this the first sync" test cannot drift apart — migration `0002` carries
 * the same literal, and that one is already on disk on every device.
 */
export const PULL_EPOCH = '2006-08-22 22:21:48 ';

export const appState = sqliteTable('tbl_app_state', {
  id: integer('id').primaryKey(),
  hydration_state: text('hydration_state').notNull().default('pending'),
  hydration_attempts: integer('hydration_attempts').notNull().default(0),
  last_error: text('last_error'),
  // The watermark the next pull asks from, straight into the URL. It is the
  // SERVER's clock, not ours.
  last_successful_pull_time: text('last_successful_pull_time')
    .notNull()
    .default(PULL_EPOCH),
});
