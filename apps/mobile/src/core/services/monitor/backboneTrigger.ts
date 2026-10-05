import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AlarmType, AndroidImportance, TriggerType } from 'react-native-notify-kit';
import { logger } from '@/core/utils/logger';
import {
  MONITOR_TRIGGER_CHANNEL_ID,
  MONITOR_TRIGGER_INTERVAL_MINUTES,
  MONITOR_TRIGGER_LAST_TICK_AT_KEY,
  MONITOR_TRIGGER_NOTIFICATION_ID,
  MONITOR_TRIGGER_RUNNING_FLAG_KEY,
  MONITOR_TRIGGER_TICK_COUNT_KEY,
} from './constants';

/**
 * Layer 1 of "Keeping the Monitor Running" — the backbone. AlarmManager-backed
 * (SET_EXACT_AND_ALLOW_WHILE_IDLE), so the OS itself wakes the process and
 * fires this even through Doze / backgrounding, unlike the plain JS-timer
 * heartbeat in foregroundService.ts, which stops once backgrounded — confirmed
 * on both an emulator and a physical Galaxy Tab A11 during the 2026-10-01 soak
 * test (root cause: setInterval fires on Choreographer frame callbacks, which
 * the OS stops delivering with no visible window — no flag or wake lock
 * changes that; this trigger sidesteps it entirely via a real OS alarm).
 *
 * Self-reschedules after every delivery (see index.js's onBackgroundEvent) —
 * a one-shot TimestampTrigger chain, because IntervalTrigger has a 15-min
 * floor and this uses a 1-min test cadence. Production Stage 1/2 intervals
 * (30/15 min) clear that floor, so production code can use a plain
 * IntervalTrigger instead — no rescheduling chain needed.
 */

async function ensureTriggerChannel(): Promise<void> {
  await notifee.createChannel({
    id: MONITOR_TRIGGER_CHANNEL_ID,
    name: 'Labour monitoring (reliable check)',
    importance: AndroidImportance.LOW,
  });
}

async function scheduleNextTrigger(): Promise<void> {
  const timestamp = Date.now() + MONITOR_TRIGGER_INTERVAL_MINUTES * 60_000;
  await notifee.createTriggerNotification(
    {
      id: MONITOR_TRIGGER_NOTIFICATION_ID,
      title: 'Monitor check',
      body: 'Reliable background check — fires even while backgrounded.',
      android: { channelId: MONITOR_TRIGGER_CHANNEL_ID },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp,
      alarmManager: { type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE },
    },
  );
}

export async function startBackboneAlerts(): Promise<void> {
  await notifee.requestPermission();
  await ensureTriggerChannel();
  await scheduleNextTrigger();
  await AsyncStorage.setItem(MONITOR_TRIGGER_RUNNING_FLAG_KEY, 'true');
  logger.debug('[MonitorTrigger] started');
}

export async function stopBackboneAlerts(): Promise<void> {
  await notifee.cancelTriggerNotifications([MONITOR_TRIGGER_NOTIFICATION_ID]);
  await AsyncStorage.setItem(MONITOR_TRIGGER_RUNNING_FLAG_KEY, 'false');
  logger.debug('[MonitorTrigger] stopped');
}

/** Called from index.js's onBackgroundEvent on EventType.DELIVERED — records the tick, then re-arms the next one. */
export async function handleTriggerDelivered(): Promise<void> {
  const prevRaw = await AsyncStorage.getItem(MONITOR_TRIGGER_TICK_COUNT_KEY);
  const next = (prevRaw ? Number(prevRaw) : 0) + 1;
  const now = new Date().toISOString();
  await AsyncStorage.multiSet([
    [MONITOR_TRIGGER_TICK_COUNT_KEY, String(next)],
    [MONITOR_TRIGGER_LAST_TICK_AT_KEY, now],
  ]);
  logger.debug(`[MonitorTrigger] tick #${next} at ${now}`);

  const stillRunning = (await AsyncStorage.getItem(MONITOR_TRIGGER_RUNNING_FLAG_KEY)) === 'true';
  if (stillRunning) {
    await scheduleNextTrigger();
  }
}

export async function getBackboneStatus(): Promise<{
  tickCount: number;
  lastTickAt: string | null;
  running: boolean;
}> {
  const entries = await AsyncStorage.multiGet([
    MONITOR_TRIGGER_TICK_COUNT_KEY,
    MONITOR_TRIGGER_LAST_TICK_AT_KEY,
    MONITOR_TRIGGER_RUNNING_FLAG_KEY,
  ]);
  const [tickCountRaw, lastTickAt, runningRaw] = entries.map(([, value]) => value);

  return {
    tickCount: tickCountRaw ? Number(tickCountRaw) : 0,
    lastTickAt: lastTickAt ?? null,
    running: runningRaw === 'true',
  };
}
