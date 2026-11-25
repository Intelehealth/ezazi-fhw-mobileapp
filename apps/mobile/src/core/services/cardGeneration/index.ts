import { getDb } from '@/core/db';
import { ensureSchema } from '@/core/db/init';
import { secureStorage } from '@/core/services/storage/secure-storage';
import { readWriterIdentity } from '@/core/session/writerIdentity';
import { logger } from '@/core/utils/logger';

import { alertNewCards } from './newCardAlert';
import { scanAllVisits, type ScanResult } from './scan';
import { nowMs } from '@/core/utils/datetime';

export type { ScanResult } from './scan';

let current: Promise<ScanResult | null> | null = null;
let currentNow = 0;
let next: Promise<ScanResult | null> | null = null;
let nextNow = 0;

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

function start(now: number): Promise<ScanResult | null> {
  currentNow = now;
  current = scanWithSession(now).finally(() => {
    current = null;
  });
  return current;
}

/**
 * The card scan, one at a time. A call while one runs gets that scan's result when its own time is not
 * later; a call with a later time gets one more scan right after it (several such calls share it, at the
 * latest time), so a card that falls due while a scan is running is never missed. Null when nobody is
 * logged in.
 */
export function runCardScan(now: number = nowMs()): Promise<ScanResult | null> {
  if (!current) return start(now);
  if (now <= currentNow) return current;
  nextNow = Math.max(nextNow, now);
  next ??= current
    .catch(() => null)
    .then(() => {
      const rerunAt = nextNow;
      next = null;
      nextNow = 0;
      return runCardScan(rerunAt);
    });
  return next;
}
