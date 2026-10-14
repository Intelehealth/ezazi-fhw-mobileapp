import { deleteDatabaseAsync } from 'expo-sqlite';

import { logger } from '@/core/utils/logger';

import { DATABASE_NAME, getRawDb, isDbOpen, resetDbHandle } from './index';
import { resetSchemaInit } from './init';

/**
 * Deletes the offline store on logout (ARCHITECTURE_RULES §6 "DB lifecycle").
 * Order is forced by expo-sqlite: it refuses to delete a database still in its
 * open cache, so the connection closes first. Always invalidates both memos,
 * even when deletion fails — a retained handle points at a file that may be
 * gone, and every later query would fail against it.
 */
export async function teardownDb(): Promise<void> {
  try {
    if (isDbOpen()) await getRawDb().closeAsync();

    // Uses expo-sqlite's API, never a file delete: a plain unlink would strip
    // the .db and leave any -wal/-shm sidecars behind.
    await deleteDatabaseAsync(DATABASE_NAME);
  } catch (error: unknown) {
    // Normal when the user logs out without ever reaching Home — the native
    // module throws DatabaseNotFoundException for a file that was never made.
    logger.warn('[db] teardown did not delete the database', error);
  } finally {
    resetDbHandle();
    resetSchemaInit();
  }
}
