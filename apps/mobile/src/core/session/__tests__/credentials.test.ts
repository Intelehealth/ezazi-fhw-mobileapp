import * as Crypto from 'expo-crypto';

import { secureStorage } from '@/core/services/storage/secure-storage';

jest.mock('@/core/services/storage/secure-storage', () => ({
  secureStorage: { get: jest.fn(), set: jest.fn(), remove: jest.fn(), clearSession: jest.fn(), clearAll: jest.fn() },
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  getRandomBytesAsync: jest.fn(),
  digestStringAsync: jest.fn(),
}));

import { hashPassword } from '../credentials';

/**
 * What matters: the password never reaches storage, the salt is minted once
 * and reused, and the digest is salt-then-password in that order — the legacy
 * concatenates `random_salt + PASSWORD`, so reversing it would make every
 * hash we write unverifiable against one the legacy wrote.
 */

const bytes = (fill: number) => Uint8Array.from(Array.from({ length: 16 }, () => fill));

describe('hashPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('digest');
    (Crypto.getRandomBytesAsync as jest.Mock).mockResolvedValue(bytes(0xab));
  });

  it('mints a salt on first use and keeps it in the keystore', async () => {
    (secureStorage.get as jest.Mock).mockResolvedValue(null);

    await hashPassword('hunter2');

    expect(secureStorage.set).toHaveBeenCalledWith('credentialSalt', 'ab'.repeat(16));
  });

  it('reuses a salt that is already stored', async () => {
    (secureStorage.get as jest.Mock).mockResolvedValue('cafe');

    await hashPassword('hunter2');

    expect(Crypto.getRandomBytesAsync).not.toHaveBeenCalled();
    expect(secureStorage.set).not.toHaveBeenCalled();
  });

  it('digests the salt and the password in that order', async () => {
    (secureStorage.get as jest.Mock).mockResolvedValue('cafe');

    await hashPassword('hunter2');

    expect(Crypto.digestStringAsync).toHaveBeenCalledWith('SHA-256', 'cafehunter2');
  });

  it('returns the digest, never the password', async () => {
    (secureStorage.get as jest.Mock).mockResolvedValue('cafe');

    await expect(hashPassword('hunter2')).resolves.toBe('digest');

    const written = (secureStorage.set as jest.Mock).mock.calls.map(([, value]) => value);
    expect(written).not.toContain('hunter2');
  });

  it('mints one salt when two logins race', async () => {
    // Two salts would leave the first hash unverifiable against the second.
    (secureStorage.get as jest.Mock).mockResolvedValue(null);

    await Promise.all([hashPassword('a'), hashPassword('b'), hashPassword('c')]);

    expect(Crypto.getRandomBytesAsync).toHaveBeenCalledTimes(1);
  });

  it('re-reads the keystore after the salt is cleared', async () => {
    // Reset app wipes it. A cached salt would outlive the wipe and every hash
    // written afterwards would be against a salt no longer on the device.
    (secureStorage.get as jest.Mock).mockResolvedValue('cafe');
    await hashPassword('hunter2');

    (secureStorage.get as jest.Mock).mockResolvedValue(null);
    await hashPassword('hunter2');

    expect(Crypto.getRandomBytesAsync).toHaveBeenCalledTimes(1);
    expect(secureStorage.set).toHaveBeenCalledWith('credentialSalt', 'ab'.repeat(16));
  });
});
