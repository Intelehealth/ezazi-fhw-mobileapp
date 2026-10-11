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
export const appState = sqliteTable('tbl_app_state', {
  id: integer('id').primaryKey(),
  hydration_state: text('hydration_state').notNull().default('pending'),
  hydration_attempts: integer('hydration_attempts').notNull().default(0),
  last_error: text('last_error'),
  staged_manifest: text('staged_manifest'),
  updated_at: text('updated_at'),
});
