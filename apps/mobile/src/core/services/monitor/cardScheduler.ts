import { runCardScan, type ScanResult } from '@/core/services/cardGeneration';
import { logger } from '@/core/utils/logger';

import { cardAlarm } from './cardAlarmNative';
import { CARD_MAX_RESCANS, CARD_PRE_WAKE_MS, CARD_RETRY_DELAY_MS, CARD_WATCHDOG_DELAY_MS } from './constants';
import { nowMs } from '@/core/utils/datetime';

export type WakeReason =
  | 'main'
  | 'watchdog'
  | 'catchUp'
  | 'boot'
  | 'update'
  | 'clock'
  | 'exactAccess'
  | 'login'
  | 'resume'
  | 'stageChange'
  | 'visitStart'
  | 'battery';

/** One line in the wake log (native file, read with `adb pull`): when a scan ran against its due time. */
function logWake(line: string): void {
  try {
    cardAlarm?.appendWakeLog(line);
  } catch (error) {
    logger.error('[monitor] wake log failed', error);
  }
}

/** Sets the alarm clock just before the next due card and the watchdog after it; none when nothing is coming. */
function arm(result: ScanResult | null, failed: boolean, now: number): void {
  if (!cardAlarm) return;
  if (!failed && (result === null || result.nextDueAt === null)) {
    // Logged out (no scan), or no visit has a card coming.
    cardAlarm.disarmCards();
    return;
  }
  const dueAt = result?.nextDueAt ?? now;
  if (failed || dueAt <= now) {
    // The scan failed, or a card is still due after the rescans: try again in a minute.
    const retryAt = now + CARD_RETRY_DELAY_MS;
    cardAlarm.armCards(retryAt, retryAt, retryAt + CARD_WATCHDOG_DELAY_MS);
    return;
  }
  const mainAt = Math.max(now + 1000, dueAt - CARD_PRE_WAKE_MS);
  const kind = cardAlarm.armCards(dueAt, mainAt, dueAt + CARD_WATCHDOG_DELAY_MS);
  if (kind === 'inexact') logger.warn('[monitor] exact alarms are off: the next card may be late');
}

async function scanThenArm(reason: WakeReason, dueAt: number): Promise<void> {
  let result: ScanResult | null = null;
  let failed = false;
  try {
    for (let attempt = 0; attempt <= CARD_MAX_RESCANS; attempt += 1) {
      const scanAt = nowMs();
      result = await runCardScan(scanAt);
      if (attempt === 0) {
        const late = dueAt > 0 ? `${scanAt - dueAt}ms` : '-';
        logWake(`scan reason=${reason} due=${dueAt} vsDue=${late} cards=${result?.cardsCreated ?? 0} next=${result?.nextDueAt ?? '-'}`);
      }
      if (result === null || result.nextDueAt === null || result.nextDueAt > nowMs()) break;
    }
  } catch (error) {
    failed = true;
    logger.error('[monitor] card scan failed', error);
    logWake(`scanFailed reason=${reason}`);
  } finally {
    // Always, so a failing scan can never end the chain of alarms.
    try {
      arm(result, failed, nowMs());
    } catch (error) {
      logger.error('[monitor] arming the next card alarm failed', error);
    }
  }
}

let queue: Promise<void> = Promise.resolve();

/**
 * Scans every open visit, then arms the alarms for the next due card. Calls run one after another, so
 * the alarms always reflect the latest scan (an alarm, the return to the app and Start Stage 2 can come
 * together). `dueAt` is the due time a wake-up was armed for, only for the wake log.
 */
export function scanAndRearm(reason: WakeReason, dueAt = 0): Promise<void> {
  const run = queue.then(() => scanThenArm(reason, dueAt));
  queue = run.catch(() => undefined);
  return run;
}
