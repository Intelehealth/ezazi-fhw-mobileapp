import { File } from 'expo-file-system';

import { secureStorage } from '@/core/services/storage/secure-storage';

jest.mock('@/core/config/env', () => ({
  env: { SERVER_URL: 'https://testezazi.intelehealth.org' },
}));
jest.mock('@/core/services/storage/secure-storage', () => ({
  secureStorage: { get: jest.fn(), set: jest.fn(), remove: jest.fn(), clearSession: jest.fn(), clearAll: jest.fn() },
}));
jest.mock('@/core/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn() } }));

const mockFile = { exists: false, uri: 'file:///docs/pulldata.zip', size: 1234, delete: jest.fn() };

jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///docs' },
  File: Object.assign(
    jest.fn(() => mockFile),
    { downloadFileAsync: jest.fn() },
  ),
}));

import { archiveFile, deleteArchive, downloadArchive, existingArchive } from '../archive.api';

/**
 * The URL and the auth header are the whole contract with the server, and
 * neither is observable until a device run — so they are pinned here.
 */

const EPOCH = '2006-08-22 22:21:48 ';

describe('downloadArchive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFile.exists = false;
    (secureStorage.get as jest.Mock).mockImplementation((key: string) =>
      Promise.resolve(
        key === 'locationUuid' ? 'loc-1' : key === 'basicCredential' ? 'Basic dXNlcjpwdw==' : null,
      ),
    );
    (File.downloadFileAsync as jest.Mock).mockResolvedValue(mockFile);
  });

  it('builds the real archive route, character for character', async () => {
    // Pinned against the request Arpan ran to produce our archive, 2026-11-16.
    // Nothing else in this repo can catch a wrong route: it is only observable
    // against a live server.
    await downloadArchive(EPOCH);

    expect(File.downloadFileAsync).toHaveBeenCalledWith(
      'https://testezazi.intelehealth.org/EMR-Middleware/webapi/pull/pulldata/loc-1/2006-08-22%2022:21:48/0/1000',
      mockFile,
      expect.anything(),
    );
  });

  it('sends the page segments, which elcg does not', async () => {
    // elcg's URL stops at the cursor. AMC sends /{page}/{limit}, and so does
    // the real request. Without them the path is one the server never sees.
    await downloadArchive(EPOCH);

    const [url] = (File.downloadFileAsync as jest.Mock).mock.calls[0] as [string];
    expect(url).toMatch(/\/0\/1000$/);
  });

  it('drops the cursor sentinel trailing space', async () => {
    // PULL_EPOCH ends in a space. In elcg the cursor is the last segment so it
    // sits harmlessly at the end; here it is a middle segment, and the space
    // would encode to %20 directly before the page number.
    await downloadArchive(EPOCH);

    const [url] = (File.downloadFileAsync as jest.Mock).mock.calls[0] as [string];
    expect(url).not.toContain('%20/0/');
    expect(url).toContain('22:21:48/0/1000');
  });

  it('escapes the space inside the cursor but not its colons', async () => {
    // encodeURIComponent would escape the colons too and change the path.
    await downloadArchive(EPOCH);

    const [url] = (File.downloadFileAsync as jest.Mock).mock.calls[0] as [string];
    expect(url).toContain('2006-08-22%2022:21:48');
    expect(url).not.toContain('%3A');
    expect(url).not.toContain(' ');
  });

  it('sends the stored basic credential, not a bearer token', async () => {
    await downloadArchive(EPOCH);

    const [, , options] = (File.downloadFileAsync as jest.Mock).mock.calls[0] as [
      string,
      unknown,
      { headers: Record<string, string> },
    ];
    expect(options.headers.Authorization).toBe('Basic dXNlcjpwdw==');
  });

  it('returns where the archive landed, never its bytes', async () => {
    const result = await downloadArchive(EPOCH);

    expect(result).toEqual({ ok: true, data: 'file:///docs/pulldata.zip' });
  });

  it('fails without downloading when setup never stored a location', async () => {
    (secureStorage.get as jest.Mock).mockResolvedValue(null);

    const result = await downloadArchive(EPOCH);

    expect(result.ok).toBe(false);
    expect(File.downloadFileAsync).not.toHaveBeenCalled();
  });

  it('returns a failure instead of throwing when the download dies', async () => {
    // The caller is a store running inside a screen effect; a throw here would
    // surface as an unhandled rejection rather than a retry on the next mount.
    (File.downloadFileAsync as jest.Mock).mockRejectedValue(new Error('socket closed'));

    const result = await downloadArchive(EPOCH);

    expect(result.ok).toBe(false);
  });
});

describe('the archive on disk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFile.exists = false;
  });

  it('reports no archive when none was left behind', () => {
    expect(existingArchive()).toBeNull();
  });

  it('reports the path of an archive an interrupted run left', () => {
    mockFile.exists = true;

    expect(existingArchive()).toBe('file:///docs/pulldata.zip');
  });

  it('deletes nothing when there is nothing to delete', () => {
    deleteArchive();

    expect(mockFile.delete).not.toHaveBeenCalled();
  });

  it('deletes the archive when one is there', () => {
    mockFile.exists = true;

    deleteArchive();

    expect(mockFile.delete).toHaveBeenCalledTimes(1);
  });

  it('always points at the same file, so a resume finds what a crash left', () => {
    expect(archiveFile().uri).toBe('file:///docs/pulldata.zip');
  });
});
