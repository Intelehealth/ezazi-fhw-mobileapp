import { userCredentials } from '@/core/db/schema';
import type { DbHandle } from '@/core/db/tx';

/**
 * `tbl_user_credentials` — the currently logged-in user.
 *
 * One row, replaced on every login, exactly as the legacy does it:
 * `SetupActivity.java:594-600` builds the same five values and inserts with
 * `CONFLICT_REPLACE`. The legacy relies on a `password TEXT UNIQUE` constraint
 * to make that replace fire, which collides when two users share a password;
 * our table has a synthetic `id` instead, so this clears and inserts rather
 * than leaning on a conflict.
 *
 * `password` holds a salted SHA-256 (see `core/session/credentials.ts`), never
 * a password. Nothing syncs this table — no `sync` or `voided` columns.
 */

export interface UserCredentialsRow {
  username: string;
  /** Salted SHA-256. Never the password. */
  password: string;
  creator_uuid_cred: string;
  chwname: string;
  provider_uuid_cred: string;
}

/**
 * Replaces whatever was there. Synchronous, so it composes into a `transact()`
 * block — see DB_CONVENTIONS §8.
 */
export function replaceCurrentUser(row: UserCredentialsRow, on: DbHandle): void {
  on.delete(userCredentials).run();
  on.insert(userCredentials).values(row).run();
}

export function findCurrentUser(on: DbHandle): UserCredentialsRow | undefined {
  const found = on.select().from(userCredentials).limit(1).all();
  if (found.length === 0) return undefined;

  const [row] = found;
  return {
    username: row.username ?? '',
    password: row.password ?? '',
    creator_uuid_cred: row.creator_uuid_cred ?? '',
    chwname: row.chwname ?? '',
    provider_uuid_cred: row.provider_uuid_cred ?? '',
  };
}
