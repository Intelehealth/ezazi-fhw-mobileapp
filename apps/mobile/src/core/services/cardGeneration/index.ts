import { env } from '@/core/config/env';
import { getDb } from '@/core/db';
import { ensureSchema } from '@/core/db/init';
import { DEV_CREATOR_UUID } from '@/core/db/seeds';
import { secureStorage } from '@/core/services/storage/secure-storage';
import { logger } from '@/core/utils/logger';

import { alertNewCards } from './newCardAlert';
import { scanAllVisits, type ScanResult } from './scan';

export type { ScanIdentity, ScanResult } from './scan';

let inFlight: Promise<ScanResult | null> | null = null;

async function scanWithSession(now: number): Promise<ScanResult | null> {
  const [accessToken, providerUuid, storedCreator] = await Promise.all([
    secureStorage.get('accessToken'),
    secureStorage.get('userUuid'),
    secureStorage.get('creatorUuid'),
  ]);
  // Temporary, dev seed builds only: a session from before the creator uuid was stored.
  const creatorUuid = storedCreator ?? (env.DEV_SEED ? DEV_CREATOR_UUID : null);
  // No session, no database (ARCHITECTURE_RULES §6): a tick after logout touches nothing.
  if (!accessToken || !providerUuid || !creatorUuid) return null;

  await ensureSchema();
  const result = scanAllVisits({ providerUuid, creatorUuid }, now, getDb());
  logger.debug('[cardGeneration] scan', result);
  if (result.cardsCreated > 0) {
    // The cards are already saved; a failed alert must not fail the scan.
    await alertNewCards().catch((error: unknown) => logger.error('[cardGeneration] new-card alert failed', error));
  }
  return result;
}

/**
 * The minute scan, one at a time: a second call while one runs gets the same result instead
 * of scanning twice. Null when nobody is logged in.
 */
export function runCardScan(now: number = Date.now()): Promise<ScanResult | null> {
  inFlight ??= scanWithSession(now).finally(() => {
    inFlight = null;
  });
  return inFlight;
}
