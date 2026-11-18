import { handleBatteryWake } from '@/core/services/batteryGuard/batteryGuard';
import { logger } from '@/core/utils/logger';

import { cardAlarm } from './cardAlarmNative';
import { scanAndRearm, type WakeReason } from './cardScheduler';
import { CARD_MAX_WAIT_MS, CARD_OVERDUE_ON_BATTERY_WAKE_MS } from './constants';

interface CardScanTaskData {
  reason?: string;
  dueAt?: number;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The JS task the native CardScanService runs after every wake-up (registered in index.js). The service
 * keeps the device awake and the app out of the freezer until this resolves.
 *
 * The alarm clock rings shortly before the due time; the task waits for the due second itself, so the
 * card's time (the scan moment, Android's rule) is its due time and no delay carries into later cards.
 * Timers run here because the task is active.
 */
export async function runCardScanTask(data: CardScanTaskData = {}): Promise<void> {
  const reason = (data.reason ?? 'main') as WakeReason;
  const dueAt = data.dueAt ?? 0;
  try {
    if (reason === 'battery') {
      await handleBatteryWake();
      // A card the main wake-up and the watchdog have not created yet: create it now.
      const cardDueAt = cardAlarm?.nextDueAt() ?? 0;
      if (cardDueAt > 0 && Date.now() >= cardDueAt + CARD_OVERDUE_ON_BATTERY_WAKE_MS) {
        await scanAndRearm('battery', cardDueAt);
      }
      return;
    }
    const wait = dueAt - Date.now();
    if ((reason === 'main' || reason === 'catchUp') && wait > 0) await sleep(Math.min(wait, CARD_MAX_WAIT_MS));
    await scanAndRearm(reason, dueAt);
  } catch (error) {
    logger.error('[monitor] card scan task failed', reason, error);
  }
}
