import { env } from '@/core/config/env';
import { DEV_CREATOR_UUID } from '@/core/db/seeds';
import { secureStorage } from '@/core/services/storage/secure-storage';

/** Who a local write is made as: the visit holder (provider) and the obs creator (user), as Android. */
export interface WriterIdentity {
  providerUuid: string;
  creatorUuid: string;
}

/**
 * The logged-in provider and user, from secure storage; null when either is missing.
 * Temporary, dev seed builds only: a session from before the creator uuid was stored
 * writes as the dev stand-in creator.
 */
export async function readWriterIdentity(): Promise<WriterIdentity | null> {
  const [providerUuid, storedCreator] = await Promise.all([
    secureStorage.get('userUuid'),
    secureStorage.get('creatorUuid'),
  ]);
  const creatorUuid = storedCreator ?? (env.DEV_SEED ? DEV_CREATOR_UUID : null);
  return providerUuid && creatorUuid ? { providerUuid, creatorUuid } : null;
}
