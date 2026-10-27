import { getDb } from '@/core/db';
import { ensureSchema } from '@/core/db/init';
import { secureStorage } from '@/core/services/storage/secure-storage';
import { readWriterIdentity } from '@/core/session/writerIdentity';
import { logger } from '@/core/utils/logger';

import { alertNewCards } from './newCardAlert';
import { scanAllVisits, type ScanResult } from './scan';

export type { ScanResult } from './scan';

let inFlight: Promise<ScanResult | null> | null = null;

async function scanWithSession(now: number): Promise<ScanResult | null> {
  const [accessToken, identity] = await Promise.all([secureStorage.get('accessToken'), readWriterIdentity()]);
  // No session, no database (ARCHITECTURE_RULES §6): a tick after logout touches nothing.
  if (!accessToken || !identity) return null;

  await ensureSchema();
  // Logout may have run while the schema check awaited; opening the database now would re-create it.
  if (!(await secureStorage.get('accessToken'))) return null;
  const result = scanAllVisits(identity, now, getDb());
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
