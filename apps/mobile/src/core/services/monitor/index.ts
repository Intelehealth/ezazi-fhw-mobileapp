import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import notifee, { EventType } from 'react-native-notify-kit';
import { runCardScan } from '@/core/services/cardGeneration';
import { logger } from '@/core/utils/logger';
import {
  ensureMonitorServiceRunning,
  getTickCount,
  startMonitorService,
  stopMonitorService,
  subscribeTickCount,
} from './foregroundService';
import {
  getBackboneStatus,
  handleTriggerDelivered,
  rearmBackboneIfRunning,
  startBackboneAlerts,
  stopBackboneAlerts,
} from './backboneTrigger';
import { MONITOR_TRIGGER_NOTIFICATION_ID } from './constants';

const BACKBONE_POLL_MS = 3000;
const STARTUP_RETRY_DELAYS_MS = [2000, 4000, 8000, 16000, 30000];

/**
 * Android refuses `startForegroundService()` outright — throwing
 * `ForegroundServiceStartNotAllowedException` — when it doesn't consider the
 * app "currently visible" at that exact moment (confirmed during the
 * 2026-10-01 six-hour test: a cold start that raced a lock-screen transition
 * hit this and silently killed the whole monitor, heartbeat and backbone
 * both, because the startup chain had no error handling at all). This is the
 * same class of problem as "restart after the OS killed the process" from
 * the source brief — a kill-and-relaunch can easily land behind a locked
 * screen. A silent failure here is exactly the opposite of "fail loud."
 */
async function startWithRetry(isCancelled: () => boolean): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    if (isCancelled()) return;
    try {
      await startMonitorService();
      if (isCancelled()) return;
      await startBackboneAlerts();
      if (attempt > 0) {
        logger.info(`[monitor] startup succeeded on retry ${attempt}`);
      }
      return;
    } catch (error) {
      const delay = STARTUP_RETRY_DELAYS_MS[Math.min(attempt, STARTUP_RETRY_DELAYS_MS.length - 1)];
      logger.error(`[monitor] startup attempt ${attempt} failed, retrying in ${delay}ms`, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Tears down everything startWithRetry() started: the foreground-service
 * notification + heartbeat, and the self-rescheduling AlarmManager chain.
 * Each step is isolated so one failing doesn't leave the other running.
 */
async function stopAll(): Promise<void> {
  try {
    await stopBackboneAlerts();
  } catch (error) {
    logger.error('[monitor] stopBackboneAlerts failed', error);
  }
  try {
    await stopMonitorService();
  } catch (error) {
    logger.error('[monitor] stopMonitorService failed', error);
  }
}

/**
 * Back in the foreground (2026-11-01 device run: the dataSync service was stopped after 6 hours, then
 * Samsung froze the app and deferred its alarms): restart the service, whose limit Android has just
 * reset; re-arm the alarm so it is exact if access was granted meanwhile; catch up on cards. Each step
 * is isolated. Exact-alarm access itself is asked for on the splash screen (`askForExactAlarms`).
 */
async function resumeOnForeground(): Promise<void> {
  try {
    await ensureMonitorServiceRunning();
  } catch (error) {
    logger.error('[monitor] foreground-service restart failed', error);
  }
  try {
    await rearmBackboneIfRunning();
  } catch (error) {
    logger.error('[monitor] backbone re-arm failed', error);
  }
  await runCardScan().catch((error: unknown) => logger.error('[monitor] foreground card scan failed', error));
}

/**
 * Long-lived singleton, started once from the composition root (App.tsx) —
 * but only once `enabled`. Must stay false until the user is authenticated:
 * `startMonitorService()` calls `notifee.requestPermission()` for
 * POST_NOTIFICATIONS, which races SplashScreen's own `PermissionsAndroid.
 * requestMultiple()` (also requesting POST_NOTIFICATIONS on API 33+) if both
 * fire on mount — two concurrent native permission requests for the same
 * permission, which can leave one of them never resolving (confirmed
 * on-device: SplashScreen's "Loading…" hung indefinitely with this
 * unconditional). There's no reason to run the labour monitor before a
 * health worker is even logged in anyway.
 */
export function useMonitorService(enabled: boolean): void {
  // Only logout (`enabled` true → false) stops the monitor. An unmount alone does not: swiping the app
  // away from Recents destroys the screen while the process and the login live on, and the monitor must
  // keep creating cards, as Android's service does (2026-11-01 device run: the swipe stopped it).
  const enabledRef = useRef(enabled);
  useEffect(() => {
    if (enabledRef.current && !enabled) void stopAll();
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Sequenced, not concurrent — both touch notifee's own shared native
    // state (channels, the foreground-service lifecycle); firing them
    // together dropped the heartbeat's notification in testing.
    let unmounted = false;
    let started = false;
    const loggedOut = () => !enabledRef.current;
    void startWithRetry(loggedOut).then(() => {
      // Logged out while startup was still in flight: the start steps that
      // already ran must be undone too.
      if (loggedOut()) {
        void stopAll();
        return;
      }
      started = true;
      // Catch-up: a card that fell due while the app was closed appears at once.
      void runCardScan().catch((error: unknown) => logger.error('[monitor] catch-up card scan failed', error));
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active' && started && !unmounted) void resumeOnForeground();
    });

    // index.js's onBackgroundEvent only catches a delivery while the app is
    // backgrounded. A delivery landing while the app happens to be in the
    // foreground needs this separate, component-scoped listener — missing
    // it isn't just one lost tick: handleTriggerDelivered() is also what
    // re-arms the *next* alarm, so one missed foreground delivery silently
    // kills the whole self-rescheduling chain (confirmed: zero backbone
    // ticks recorded in AsyncStorage across a full 15-minute soak test,
    // because the very first delivery landed during the foreground phase).
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.DELIVERED && detail.notification?.id === MONITOR_TRIGGER_NOTIFICATION_ID) {
        void handleTriggerDelivered();
      }
    });
    // Listeners only: stopping the service and the alarm chain is the logout
    // effect's job above, and an unmount must leave them running.
    return () => {
      unmounted = true;
      unsubscribe();
      appState.remove();
    };
  }, [enabled]);
}

/** Live tick count, re-rendering on every tick — for an on-screen debug indicator. */
export function useMonitorTickCount(): number {
  return useSyncExternalStore(subscribeTickCount, getTickCount);
}

/**
 * Backbone-trigger status, polled from AsyncStorage (no in-memory listener
 * exists across the JS-instance boundary a killed/restarted process crosses)
 * — for the same on-screen debug indicator, to show the reliable layer is
 * advancing even when the heartbeat above has stopped.
 */
export function useBackboneStatus(): { tickCount: number; lastTickAt: string | null; running: boolean } {
  const [status, setStatus] = useState({ tickCount: 0, lastTickAt: null as string | null, running: false });

  useEffect(() => {
    let cancelled = false;
    const poll = (): void => {
      void getBackboneStatus().then((next) => {
        if (!cancelled) setStatus(next);
      });
    };
    poll();
    const timer = setInterval(poll, BACKBONE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return status;
}

export { stopMonitorService, getTickCount, registerMonitorForegroundServiceHandler } from './foregroundService';
export { startBackboneAlerts, stopBackboneAlerts, handleTriggerDelivered, getBackboneStatus } from './backboneTrigger';
