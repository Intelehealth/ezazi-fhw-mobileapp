import { deleteDatabaseAsync } from 'expo-sqlite';

import { logger } from '@/core/utils/logger';

import { resetDbHandle } from '../index';
import { resetSchemaInit } from '../init';
import { teardownDb } from '../teardown';

/**
 * expo-sqlite cannot load in Node, so the seams are mocked and these assert
 * the contract teardown owes its callers: close before delete, and invalidate
 * both memos no matter what. Logout must never leave a handle pointing at a
 * file that is gone.
 */

const mockCloseAsync = jest.fn();
let mockOpen = true;

jest.mock('expo-sqlite', () => ({ deleteDatabaseAsync: jest.fn() }));
jest.mock('../index', () => ({
  DATABASE_NAME: 'localrecords.db',
  isDbOpen: () => mockOpen,
  getRawDb: () => ({ closeAsync: mockCloseAsync }),
  resetDbHandle: jest.fn(),
}));
jest.mock('../init', () => ({ resetSchemaInit: jest.fn() }));
jest.mock('@/core/utils/logger', () => ({ logger: { warn: jest.fn() } }));

const deleteDb = deleteDatabaseAsync as jest.MockedFunction<typeof deleteDatabaseAsync>;

describe('teardownDb', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpen = true;
    deleteDb.mockResolvedValue(undefined);
  });

  it('closes the connection before deleting', async () => {
    // expo-sqlite refuses to delete a database still in its open cache, so
    // the wrong order fails on device while passing any order-blind test.
    await teardownDb();

    expect(mockCloseAsync).toHaveBeenCalledTimes(1);
    expect(deleteDb).toHaveBeenCalledTimes(1);
    expect(mockCloseAsync.mock.invocationCallOrder[0]).toBeLessThan(
      deleteDb.mock.invocationCallOrder[0],
    );
  });

  it('skips the close when the database was never opened', async () => {
    // Logging out without ever reaching Home: there is no handle to close.
    mockOpen = false;

    await teardownDb();

    expect(mockCloseAsync).not.toHaveBeenCalled();
    expect(deleteDb).toHaveBeenCalledTimes(1);
  });

  it('invalidates both memos', async () => {
    // Only resetSchemaInit is called today by dbBootstrap.reset(); missing
    // resetDbHandle leaves a Drizzle handle on a deleted file.
    await teardownDb();

    expect(resetDbHandle).toHaveBeenCalledTimes(1);
    expect(resetSchemaInit).toHaveBeenCalledTimes(1);
  });

  it('invalidates both memos even when deletion fails', async () => {
    deleteDb.mockRejectedValue(new Error('DeleteDatabaseFileException'));

    await teardownDb();

    expect(resetDbHandle).toHaveBeenCalledTimes(1);
    expect(resetSchemaInit).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the database file is missing', async () => {
    // The native module throws DatabaseNotFoundException here; logout must
    // still complete, or a user cannot sign out of a half-initialised app.
    deleteDb.mockRejectedValue(new Error('DatabaseNotFoundException'));

    await expect(teardownDb()).resolves.toBeUndefined();
  });

  it('invalidates the memos even if the error path itself throws', async () => {
    // Pins the `finally`: without it the resets sit after the catch and are
    // skipped the moment anything in the failure branch misbehaves.
    deleteDb.mockRejectedValue(new Error('DeleteDatabaseFileException'));
    (logger.warn as jest.Mock).mockImplementationOnce(() => {
      throw new Error('logger exploded');
    });

    await expect(teardownDb()).rejects.toThrow('logger exploded');
    expect(resetDbHandle).toHaveBeenCalledTimes(1);
    expect(resetSchemaInit).toHaveBeenCalledTimes(1);
  });

  it('does not throw when closing fails', async () => {
    mockCloseAsync.mockRejectedValue(new Error('AccessClosedResourceException'));

    await expect(teardownDb()).resolves.toBeUndefined();
    expect(resetDbHandle).toHaveBeenCalledTimes(1);
  });
});
