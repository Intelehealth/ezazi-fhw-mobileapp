import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import notifee from 'react-native-notify-kit';
import { i18n } from '@/core/i18n';
import { logger } from '@/core/utils/logger';

import { cardAlarm } from './cardAlarmNative';
import { scanAndRearm } from './cardScheduler';
import { LEGACY_TRIGGER_IDS } from './constants';

/** The old monitor's alarms (an app updated mid-labour still has them): cancelled, or they show a stray notification. */
async function cancelLegacyMonitor(): Promise<void> {
  try {
    await notifee.cancelTriggerNotifications(LEGACY_TRIGGER_IDS);
  } catch (error) {
    logger.error('[monitor] could not cancel the old monitor triggers', error);
  }
}

function startMonitor(): void {
  try {
    cardAlarm?.setTexts(i18n.t('monitor.channelName'), i18n.t('monitor.notificationTitle'));
    cardAlarm?.start();
  } catch (error) {
    logger.error('[monitor] start failed', error);
  }
  void cancelLegacyMonitor();
  // Catch-up: a card that fell due while the app was closed is created now, then the next one is armed.
  void scanAndRearm('login');
}

function stopMonitor(): void {
  try {
    // Native: the running flag is cleared first, then every alarm cancelled (CLAUDE.md rule 14).
    cardAlarm?.stop();
  } catch (error) {
    logger.error('[monitor] stop failed', error);
  }
}

/**
 * Keeps labour cards coming while a nurse is logged in (App.tsx, `enabled` = authenticated). The cards
 * come from alarms (modules/card-alarm): an alarm clock just before each due card and a watchdog after
 * it, each running the scan in a short foreground service (`cardScanTask.ts`), so it works with the app
 * open, in the background, swiped away, locked or idle. This hook only starts and stops that, and scans
 * on every return to the app.
 *
 * Only logout (`enabled` true → false) stops it. An unmount alone (the app swiped away from Recents)
 * leaves the process and the login running, and cards must keep coming (2026-11-01 device run).
 */
export function useMonitorService(enabled: boolean): void {
  const enabledRef = useRef(enabled);
  useEffect(() => {
    if (enabledRef.current && !enabled) stopMonitor();
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    startMonitor();
    // Back in the app: create a card that fell due meanwhile and re-arm (also picks up exact-alarm access
    // granted in the settings page).
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void scanAndRearm('resume');
    });
    return () => appState.remove();
  }, [enabled]);
}

const STATUS_POLL_MS = 5000;

/** The last wake-ups (due time, how late, cards made), for the debug badge on Home. */
export function useCardWakeLog(lines = 3): string[] {
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    const read = () => {
      try {
        setLog(cardAlarm?.readWakeLog(lines) ?? []);
      } catch (error) {
        logger.error('[monitor] reading the wake log failed', error);
      }
    };
    read();
    const timer = setInterval(read, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [lines]);
  return log;
}

export { scanAndRearm } from './cardScheduler';
export { runCardScanTask } from './cardScanTask';
export { CARD_SCAN_TASK } from './constants';
