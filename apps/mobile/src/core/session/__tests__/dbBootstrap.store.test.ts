import { deleteArchive, downloadArchive, existingArchive } from '@/core/api/archive.api';
import { ensureSchema } from '@/core/db/init';
import { appStateRepo, userCredentialsRepo } from '@/core/db/repositories';
import { readArchive } from '@/core/db/sync/readArchive';
import { secureStorage } from '@/core/services/storage/secure-storage';
import { showToast } from '@/core/utils/toast';

jest.mock('@/core/db/init', () => ({ ensureSchema: jest.fn(), resetSchemaInit: jest.fn() }));
jest.mock('@/core/db/tx', () => ({
  // The repositories are mocked, so the handle never has to be real.
  transact: jest.fn((fn: (tx: unknown) => unknown) => fn({})),
}));
jest.mock('@/core/db/repositories', () => ({
  appStateRepo: { hasNeverPulled: jest.fn(), getPullCursor: jest.fn() },
  userCredentialsRepo: { replaceCurrentUser: jest.fn() },
}));
jest.mock('@/core/db/sync/readArchive', () => ({ readArchive: jest.fn() }));
jest.mock('@/core/api/archive.api', () => ({
  downloadArchive: jest.fn(),
  existingArchive: jest.fn(),
  deleteArchive: jest.fn(),
}));
jest.mock('@/core/services/storage/secure-storage', () => ({
  secureStorage: { get: jest.fn(), set: jest.fn(), remove: jest.fn(), clearSession: jest.fn(), clearAll: jest.fn() },
}));
jest.mock('@/core/utils/toast', () => ({ showToast: jest.fn() }));
jest.mock('@/core/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/core/i18n', () => ({ i18n: { t: (key: string) => key } }));

import { useDbBootstrapStore } from '../dbBootstrap.store';

/**
 * The ordering rule is the thing worth guarding: the zip may only be deleted
 * after readArchive has returned, because readArchive commits the cursor last.
 * Delete it earlier and a crash loses records the server will not resend.
 */

const EPOCH = '2006-08-22 22:21:48 ';

const ROW = {
  username: 'nurse1',
  password: 'hash-1',
  creator_uuid_cred: 'user-1',
  chwname: 'Nurse One',
  provider_uuid_cred: 'provider-1',
};

describe('useDbBootstrapStore.initialise', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDbBootstrapStore.setState({ phase: 'idle' });
    (ensureSchema as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.get as jest.Mock).mockResolvedValue(null);
    (appStateRepo.hasNeverPulled as jest.Mock).mockReturnValue(false);
    (appStateRepo.getPullCursor as jest.Mock).mockReturnValue(EPOCH);
    (existingArchive as jest.Mock).mockReturnValue(null);
    (downloadArchive as jest.Mock).mockResolvedValue({ ok: true, data: 'file:///docs/pulldata.zip' });
    (readArchive as jest.Mock).mockResolvedValue({ entries: 15, rows: 42, cursor: '2026-11-16 09:00:00' });
  });

  it('applies the schema and goes ready when there is nothing to pull', async () => {
    await useDbBootstrapStore.getState().initialise();

    expect(ensureSchema).toHaveBeenCalledTimes(1);
    expect(downloadArchive).not.toHaveBeenCalled();
    expect(useDbBootstrapStore.getState().phase).toBe('ready');
  });

  it('moves the row login stashed into the table, then clears the key', async () => {
    (secureStorage.get as jest.Mock).mockResolvedValue(JSON.stringify(ROW));

    await useDbBootstrapStore.getState().initialise();

    expect(userCredentialsRepo.replaceCurrentUser).toHaveBeenCalledWith(ROW, expect.anything());
    expect(secureStorage.remove).toHaveBeenCalledWith('pendingCredentials');
  });

  it('writes no credentials row when login left nothing', async () => {
    await useDbBootstrapStore.getState().initialise();

    expect(userCredentialsRepo.replaceCurrentUser).not.toHaveBeenCalled();
    expect(secureStorage.remove).not.toHaveBeenCalled();
  });

  it('downloads, applies and then deletes the archive on a first sync', async () => {
    (appStateRepo.hasNeverPulled as jest.Mock).mockReturnValue(true);

    await useDbBootstrapStore.getState().initialise();

    expect(downloadArchive).toHaveBeenCalledWith(EPOCH);
    expect(readArchive).toHaveBeenCalledWith('file:///docs/pulldata.zip');
    expect(showToast).toHaveBeenCalledWith('home.initialSyncComplete');
    expect(useDbBootstrapStore.getState().phase).toBe('ready');
  });

  it('deletes the zip only after the archive has been applied', async () => {
    // readArchive commits the cursor last. Deleting first would lose every row
    // a crash interrupted, because the server has no reason to resend them.
    (appStateRepo.hasNeverPulled as jest.Mock).mockReturnValue(true);
    const order: string[] = [];
    (readArchive as jest.Mock).mockImplementation(() => {
      order.push('apply');
      return Promise.resolve({ entries: 15, rows: 42, cursor: 'c' });
    });
    (deleteArchive as jest.Mock).mockImplementation(() => order.push('delete'));

    await useDbBootstrapStore.getState().initialise();

    expect(order).toEqual(['apply', 'delete']);
  });

  it('applies a zip an interrupted run left instead of downloading it again', async () => {
    (appStateRepo.hasNeverPulled as jest.Mock).mockReturnValue(true);
    (existingArchive as jest.Mock).mockReturnValue('file:///docs/pulldata.zip');

    await useDbBootstrapStore.getState().initialise();

    expect(downloadArchive).not.toHaveBeenCalled();
    expect(readArchive).toHaveBeenCalledWith('file:///docs/pulldata.zip');
  });

  it('keeps the zip when applying it fails, so the next launch can retry', async () => {
    (appStateRepo.hasNeverPulled as jest.Mock).mockReturnValue(true);
    (readArchive as jest.Mock).mockRejectedValue(new Error('corrupt entry'));

    await useDbBootstrapStore.getState().initialise();

    expect(deleteArchive).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(useDbBootstrapStore.getState().phase).toBe('failed');
  });

  it('fails without applying anything when the download fails', async () => {
    (appStateRepo.hasNeverPulled as jest.Mock).mockReturnValue(true);
    (downloadArchive as jest.Mock).mockResolvedValue({ ok: false, error: new Error('offline') });

    await useDbBootstrapStore.getState().initialise();

    expect(readArchive).not.toHaveBeenCalled();
    expect(useDbBootstrapStore.getState().phase).toBe('failed');
  });

  it('retries on the next mount after a failure', async () => {
    (appStateRepo.hasNeverPulled as jest.Mock).mockReturnValue(true);
    (downloadArchive as jest.Mock).mockResolvedValueOnce({ ok: false, error: new Error('offline') });

    await useDbBootstrapStore.getState().initialise();
    await useDbBootstrapStore.getState().initialise();

    expect(downloadArchive).toHaveBeenCalledTimes(2);
    expect(useDbBootstrapStore.getState().phase).toBe('ready');
  });

  it('does not start a second import while one is running', async () => {
    // Home's effect runs on every mount; a second run would download the same
    // archive over the top of the one being applied.
    (appStateRepo.hasNeverPulled as jest.Mock).mockReturnValue(true);

    await Promise.all([
      useDbBootstrapStore.getState().initialise(),
      useDbBootstrapStore.getState().initialise(),
    ]);

    expect(downloadArchive).toHaveBeenCalledTimes(1);
  });

  it('does nothing once ready', async () => {
    useDbBootstrapStore.setState({ phase: 'ready' });

    await useDbBootstrapStore.getState().initialise();

    expect(ensureSchema).not.toHaveBeenCalled();
  });

  it('shows no toast when there was no first sync to finish', async () => {
    await useDbBootstrapStore.getState().initialise();

    expect(showToast).not.toHaveBeenCalled();
  });
});
