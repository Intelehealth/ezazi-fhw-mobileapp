import { env } from '@/core/config/env';
import { DEV_CREATOR_UUID } from '@/core/db/seeds';
import { secureStorage } from '@/core/services/storage/secure-storage';

import { readWriterIdentity } from '../writerIdentity';

jest.mock('@/core/services/storage/secure-storage', () => ({ secureStorage: { get: jest.fn() } }));
jest.mock('@/core/config/env', () => ({ env: { DEV_SEED: false } }));

const session = (values: Record<string, string | null>) =>
  (secureStorage.get as jest.Mock).mockImplementation(async (key: string) => values[key] ?? null);

/** Local writes are made as the visit holder (provider) and the obs creator (user), as Android. */
describe('readWriterIdentity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (env as { DEV_SEED: boolean }).DEV_SEED = false;
  });

  it('reads the logged-in provider and user', async () => {
    session({ userUuid: 'provider-1', creatorUuid: 'user-1' });

    await expect(readWriterIdentity()).resolves.toEqual({ providerUuid: 'provider-1', creatorUuid: 'user-1' });
  });

  it('is null without a provider or without a user', async () => {
    session({ creatorUuid: 'user-1' });
    await expect(readWriterIdentity()).resolves.toBeNull();

    session({ userUuid: 'provider-1' });
    await expect(readWriterIdentity()).resolves.toBeNull();
  });

  it('writes as the dev stand-in creator only in dev seed builds', async () => {
    (env as { DEV_SEED: boolean }).DEV_SEED = true;
    session({ userUuid: 'provider-1' });

    await expect(readWriterIdentity()).resolves.toEqual({ providerUuid: 'provider-1', creatorUuid: DEV_CREATOR_UUID });
  });
});
