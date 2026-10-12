import notifee, { AndroidForegroundServiceType, AndroidImportance } from 'react-native-notify-kit';
import { logger } from '@/core/utils/logger';
import { MONITOR_CHANNEL_ID, MONITOR_NOTIFICATION_ID, MONITOR_TICK_INTERVAL_MS } from './constants';

/**
 * Layer 2 of "Keeping the Monitor Running" — the heartbeat. Proves the
 * foreground service survives foreground and backgrounding at the native
 * level (the persistent notification, the process staying alive), but the
 * tick itself is a plain JS setInterval and is NOT a reliable clock once
 * backgrounded: RN's setInterval/setTimeout fire on Android's Choreographer
 * frame callbacks (JavaTimerManager.kt), which the OS stops delivering once
 * there's no visible window to vsync against — confirmed on both an emulator
 * and a physical Galaxy Tab A11 during the 2026-10-01 soak test. No wake
 * lock, Doze exemption, or RN headless-task registration changed that.
 * backboneTrigger.ts (AlarmManager-backed) is the layer that actually
 * survives backgrounding — this heartbeat is foreground-freshness only.
 */

let tickCount = 0;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let resolveServiceTask: (() => void) | null = null;
const tickListeners = new Set<() => void>();

/** For useSyncExternalStore — lets UI (e.g. HomeScreen) re-render on every tick. */
export function subscribeTickCount(listener: () => void): () => void {
  tickListeners.add(listener);
  return () => tickListeners.delete(listener);
}

async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: MONITOR_CHANNEL_ID,
    name: 'Labour monitor',
    importance: AndroidImportance.LOW,
  });
}

/**
 * Starts the Android service: only this call sets `asForegroundService` +
 * `foregroundServiceTypes` — the fields that actually promote the process.
 * Once started, the service stays foreground on its own; re-asserting those
 * fields on every tick needlessly re-triggers the library's per-call
 * foregroundServiceBehavior bundling, which on this RN/New-Arch combination
 * mis-serializes as a Double where native expects an Integer (logged as a
 * caught `Bundle` warning — harmless, but worth not spamming every 5s).
 */
async function displayHeartbeat(): Promise<void> {
  const stamp = new Date().toISOString();
  await notifee.displayNotification({
    id: MONITOR_NOTIFICATION_ID,
    title: 'eZAZI monitor active',
    body: `Tick ${tickCount} · ${stamp}`,
    android: {
      channelId: MONITOR_CHANNEL_ID,
      asForegroundService: true,
      foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_DATA_SYNC],
      smallIcon: 'ic_launcher',
      ongoing: true,
    },
  });
}

/** Per-tick content refresh — same notification id, no FGS fields restated. */
async function updateHeartbeat(): Promise<void> {
  const stamp = new Date().toISOString();
  await notifee.displayNotification({
    id: MONITOR_NOTIFICATION_ID,
    title: 'eZAZI monitor active',
    body: `Tick ${tickCount} · ${stamp}`,
    android: {
      channelId: MONITOR_CHANNEL_ID,
      smallIcon: 'ic_launcher',
      ongoing: true,
    },
  });
}

async function runTick(): Promise<void> {
  tickCount += 1;
  logger.debug('[monitor] tick', tickCount, new Date().toISOString());
  tickListeners.forEach((listener) => listener());
  try {
    await updateHeartbeat();
  } catch (error) {
    logger.error('[monitor] heartbeat update failed', error);
  }
}

/**
 * Registers what the Android foreground service runs. Must be called once,
 * at app boot (index.js) — this is what the OS re-invokes when it restarts
 * the service, so registering it only inside a component would miss that.
 * The returned promise is only ever resolved by stopMonitorService(); letting
 * it resolve on its own is what tells Android the service is done.
 */
export function registerMonitorForegroundServiceHandler(): void {
  notifee.registerForegroundService(
    () =>
      new Promise<void>((resolve) => {
        resolveServiceTask = resolve;
        if (tickTimer === null) {
          void runTick();
          tickTimer = setInterval(() => {
            void runTick();
          }, MONITOR_TICK_INTERVAL_MS);
        }
      }),
  );
}

/** Starts the service: shows the persistent notification, which is what actually launches the registered runner. */
export async function startMonitorService(): Promise<void> {
  await notifee.requestPermission();
  await ensureChannel();
  await displayHeartbeat();
}

export async function stopMonitorService(): Promise<void> {
  if (tickTimer !== null) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
  resolveServiceTask?.();
  resolveServiceTask = null;
  tickCount = 0;
  tickListeners.forEach((listener) => listener());
  await notifee.stopForegroundService();
}

export function getTickCount(): number {
  return tickCount;
}
