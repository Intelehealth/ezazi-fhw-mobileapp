import { userCredentialsRepo, type UserCredentialsRow } from '@/core/db/repositories';
import { userCredentials } from '@/core/db/schema';
import type { DbHandle } from '@/core/db/tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * One row, replaced on every login. The legacy leans on a `password TEXT
 * UNIQUE` constraint to make its CONFLICT_REPLACE fire, which does the wrong
 * thing when two users share a password; ours has a synthetic id, so the
 * replace has to be explicit. That is what these guard.
 */

const row = (over: Partial<UserCredentialsRow> = {}): UserCredentialsRow => ({
  username: 'nurse1',
  password: 'hash-1',
  creator_uuid_cred: 'user-1',
  chwname: 'Nurse One',
  provider_uuid_cred: 'provider-1',
  ...over,
});

describe('userCredentialsRepo', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db as unknown as DbHandle;
  });

  afterEach(() => {
    ctx.close();
  });

  it('writes the row and reads it back', () => {
    userCredentialsRepo.replaceCurrentUser(row(), db);

    expect(userCredentialsRepo.findCurrentUser(db)).toEqual(row());
  });

  it('keeps exactly one row when a different user logs in', () => {
    userCredentialsRepo.replaceCurrentUser(row(), db);
    userCredentialsRepo.replaceCurrentUser(
      row({ username: 'nurse2', creator_uuid_cred: 'user-2', chwname: 'Nurse Two' }),
      db,
    );

    expect(ctx.db.select().from(userCredentials).all()).toHaveLength(1);
    expect(userCredentialsRepo.findCurrentUser(db)?.username).toBe('nurse2');
  });

  it('replaces a row even when the new user has the same password hash', () => {
    // The legacy's UNIQUE-on-password trick makes this the collision case.
    userCredentialsRepo.replaceCurrentUser(row(), db);
    userCredentialsRepo.replaceCurrentUser(row({ username: 'nurse2' }), db);

    expect(ctx.db.select().from(userCredentials).all()).toHaveLength(1);
    expect(userCredentialsRepo.findCurrentUser(db)?.username).toBe('nurse2');
  });

  it('returns undefined before anyone has logged in', () => {
    expect(userCredentialsRepo.findCurrentUser(db)).toBeUndefined();
  });
});
