import { openDatabaseSync } from 'expo-sqlite';

import { DATABASE_NAME, getDb, isDbOpen, resetDbHandle } from '../index';

/**
 * expo-sqlite cannot load in Node, so the open seam is mocked. What matters
 * here is the contract `getDb` owes every caller: open lazily, open once, and
 * put the connection in WAL before anybody gets to query it.
 */

const mockExecSync = jest.fn();

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({ execSync: mockExecSync })),
}));
jest.mock('drizzle-orm/expo-sqlite', () => ({ drizzle: () => ({ orm: true }) }));

const open = openDatabaseSync as jest.MockedFunction<typeof openDatabaseSync>;

describe('getDb', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbHandle();
  });

  it('does not open the database until it is asked for', () => {
    // The DB must not exist for a logged-out user, so importing is not opening.
    expect(isDbOpen()).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it('turns on WAL, so a read during a write is not SQLITE_BUSY', () => {
    getDb();

    expect(mockExecSync).toHaveBeenCalledWith('PRAGMA journal_mode = WAL;');
  });

  it('sets WAL BEFORE handing the connection to Drizzle', () => {
    // A query issued on a connection still in rollback-journal mode is the
    // exact failure this guards against, so the order is the contract.
    getDb();

    expect(open.mock.invocationCallOrder[0]).toBeLessThan(
      mockExecSync.mock.invocationCallOrder[0],
    );
  });

  it('opens once and memoises, however many callers ask', () => {
    getDb();
    getDb();
    getDb();

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(DATABASE_NAME, { enableChangeListener: true });
    expect(mockExecSync).toHaveBeenCalledTimes(1);
  });

  it('opens again after the handle is invalidated', () => {
    getDb();
    resetDbHandle();
    getDb();

    expect(open).toHaveBeenCalledTimes(2);
    // The new file needs the pragma too — it is set per connection.
    expect(mockExecSync).toHaveBeenCalledTimes(2);
  });
});
