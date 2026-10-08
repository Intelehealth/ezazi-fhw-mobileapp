import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import notifee, { AlarmType, AndroidImportance, TriggerType } from 'react-native-notify-kit';
import { i18n } from '@/core/i18n';
import { logger } from '@/core/utils/logger';
import { useBatteryGuardStore } from './batteryGuard.store';
import {
  BATTERY_ALERT_CHANNEL_ID,
  BATTERY_DIALOG_PENDING_KEY,
  BATTERY_DIALOG_SHOWN_KEY,
  BATTERY_LAST_NOTIFIED_PERCENT_KEY,
  BATTERY_NOTIFICATION_ID,
  BATTERY_SILENT_CHANNEL_ID,
  DIALOG_THRESHOLD_PERCENT,
  ONGOING_THRESHOLD_PERCENT,
  SOUND_MILESTONE_PERCENTS,
} from './constants';

/**
 * Low-battery alert — entirely separate from backboneTrigger.ts's own
 * AlarmManager chain (own channels, own notification id, own AsyncStorage
 * keys, own trigger loop) so nothing here can regress the already
 * soak-tested labour-monitor trigger.
 *
 * `expo-battery`'s addBatteryLevelListener is unsuitable for this on
 * Android: the docs say it only fires on the OS's own BATTERY_LOW /
 * BATTERY_OKAY broadcasts, not on every 1% step — far too coarse for a
 * "notify every percent between 30-35" requirement. So the level itself is
 * polled on a short AlarmManager-backed cycle (same SET_EXACT_AND_ALLOW_
 * WHILE_IDLE mechanism as the labour-monitor backbone, so it survives Doze
 * the same proven way). addBatteryStateListener (plug/unplug), by
 * contrast, isn't documented as throttled, so that's wired as a plain
 * event listener for an immediate reaction — the moment the user plugs in,
 * the notification cancels without waiting for the next poll.
 */

// `-v2`: Android fixes a channel's importance at creation and ignores later
// changes, so making this channel IMPORTANCE_MIN needed a new id.
const TRIGGER_CHANNEL_ID = 'battery-guard-trigger-v2';
const TRIGGER_NOTIFICATION_ID = 'battery-guard-trigger';
const RUNNING_FLAG_KEY = 'battery_guard_running';

// Test cadence — mirrors backboneTrigger.ts's own MONITOR_TRIGGER_INTERVAL_MINUTES.
// A battery percent point doesn't need second-by-second tracking; 1 minute
// catches every 1% step comfortably (batteries don't typically drop faster).
const CHECK_INTERVAL_MINUTES = 1;

async function ensureChannels(): Promise<void> {
  await notifee.createChannel({
    id: TRIGGER_CHANNEL_ID,
    name: 'Battery check (internal)',
    // MIN: silent, no status-bar icon, collapsed in the shade. This
    // notification is only the alarm's vehicle, not something to read.
    importance: AndroidImportance.MIN,
  });
  await notifee.createChannel({
    id: BATTERY_SILENT_CHANNEL_ID,
    name: 'Battery warnings',
    importance: AndroidImportance.LOW,
  });
  await notifee.createChannel({
    id: BATTERY_ALERT_CHANNEL_ID,
    name: 'Battery warnings (urgent)',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
    vibration: true,
  });
}

async function scheduleNextCheck(): Promise<void> {
  const timestamp = Date.now() + CHECK_INTERVAL_MINUTES * 60_000;
  await notifee.createTriggerNotification(
    {
      id: TRIGGER_NOTIFICATION_ID,
      title: 'Battery check',
      body: 'Internal battery-level check.',
      android: { channelId: TRIGGER_CHANNEL_ID },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp,
      alarmManager: { type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE },
    },
  );
}

async function clearAlertState(): Promise<void> {
  await notifee.cancelNotification(BATTERY_NOTIFICATION_ID);
  await AsyncStorage.multiSet([[BATTERY_DIALOG_SHOWN_KEY, 'false']]);
  await AsyncStorage.multiRemove([BATTERY_DIALOG_PENDING_KEY, BATTERY_LAST_NOTIFIED_PERCENT_KEY]);
}

/**
 * Reads back a dialog that was triggered while the app wasn't open to show
 * it (killed, or the trigger fired in the background) — called once from
 * useBatteryGuard() on start. Zustand state doesn't survive the process
 * being killed, so the percent itself has to be persisted, not just a flag.
 */
export async function checkPendingDialog(): Promise<number | null> {
  const pending = await AsyncStorage.getItem(BATTERY_DIALOG_PENDING_KEY);
  return pending ? Number(pending) : null;
}

/** Called when the user dismisses the dialog — stops it reappearing on the next app open. */
export async function acknowledgeDialog(): Promise<void> {
  await AsyncStorage.removeItem(BATTERY_DIALOG_PENDING_KEY);
}

/** Core check — reads the current level/state once and applies the alert state machine. Called on every trigger firing AND once immediately on start. */
export async function evaluateBatteryNow(): Promise<void> {
  const { batteryLevel, batteryState } = await Battery.getPowerStateAsync();

  // CHARGING / FULL / NOT_CHARGING all mean the cable is connected — the
  // user did what we asked, so no more alerts regardless of level.
  // NOT_CHARGING (Android-only) is "plugged in but paused/limited", still
  // connected from the user's point of view. Only UNPLUGGED (and the rare
  // UNKNOWN, treated conservatively as "could be unplugged") keep the
  // alert logic running.
  const isConnected =
    batteryState === Battery.BatteryState.CHARGING ||
    batteryState === Battery.BatteryState.FULL ||
    batteryState === Battery.BatteryState.NOT_CHARGING;

  if (isConnected) {
    await clearAlertState();
    return;
  }

  if (batteryLevel < 0) return; // -1 = unknown, nothing to evaluate

  const percent = Math.round(batteryLevel * 100);
  if (percent > DIALOG_THRESHOLD_PERCENT) return; // comfortably charged

  const dialogShown = (await AsyncStorage.getItem(BATTERY_DIALOG_SHOWN_KEY)) === 'true';
  if (!dialogShown) {
    await AsyncStorage.multiSet([
      [BATTERY_DIALOG_SHOWN_KEY, 'true'],
      [BATTERY_DIALOG_PENDING_KEY, String(percent)],
    ]);
    // Shows immediately if the app happens to be foreground right now;
    // if it isn't (or this ran from the background event), the pending
    // AsyncStorage entry above is what shows it on the next app open —
    // see useBatteryGuard().
    useBatteryGuardStore.getState().showDialog(percent);
  }

  const lastNotifiedRaw = await AsyncStorage.getItem(BATTERY_LAST_NOTIFIED_PERCENT_KEY);
  const lastNotified = lastNotifiedRaw ? Number(lastNotifiedRaw) : null;
  if (lastNotified === percent) return; // nothing new since the last check

  await AsyncStorage.setItem(BATTERY_LAST_NOTIFIED_PERCENT_KEY, String(percent));

  const isCritical = percent <= ONGOING_THRESHOLD_PERCENT;
  const playSound = SOUND_MILESTONE_PERCENTS.includes(percent);

  try {
    await notifee.displayNotification({
      id: BATTERY_NOTIFICATION_ID,
      title: i18n.t('batteryGuard.notification.title'),
      body: i18n.t('batteryGuard.notification.body', { percent }),
      android: {
        channelId: playSound ? BATTERY_ALERT_CHANNEL_ID : BATTERY_SILENT_CHANNEL_ID,
        ongoing: isCritical,
        autoCancel: !isCritical,
        smallIcon: 'ic_launcher',
      },
    });
  } catch (error) {
    logger.error('[batteryGuard] displayNotification failed', error);
  }
}

/** Called from index.js's onBackgroundEvent / index.ts's onForegroundEvent on the trigger's DELIVERED event. */
export async function handleCheckTriggerDelivered(): Promise<void> {
  // Same as handleTriggerDelivered(): dismiss the displayed "Battery check"
  // vehicle notification; isolated so it can never block the check or re-arm.
  try {
    await notifee.cancelDisplayedNotification(TRIGGER_NOTIFICATION_ID);
  } catch (error) {
    logger.error('[batteryGuard] could not dismiss the displayed trigger notification', error);
  }

  await evaluateBatteryNow();

  const stillRunning = (await AsyncStorage.getItem(RUNNING_FLAG_KEY)) === 'true';
  if (stillRunning) {
    await scheduleNextCheck();
  }
}

let activeStateSubscription: ReturnType<typeof Battery.addBatteryStateListener> | null = null;

export async function startBatteryGuard(): Promise<void> {
  await ensureChannels();
  await AsyncStorage.setItem(RUNNING_FLAG_KEY, 'true');
  await evaluateBatteryNow();
  await scheduleNextCheck();

  activeStateSubscription?.remove();
  activeStateSubscription = Battery.addBatteryStateListener(({ batteryState }) => {
    const isConnected =
      batteryState === Battery.BatteryState.CHARGING ||
      batteryState === Battery.BatteryState.FULL ||
      batteryState === Battery.BatteryState.NOT_CHARGING;
    if (isConnected) {
      void clearAlertState();
    } else {
      void evaluateBatteryNow();
    }
  });

  logger.debug('[batteryGuard] started');
}

export async function stopBatteryGuard(): Promise<void> {
  activeStateSubscription?.remove();
  activeStateSubscription = null;
  // Flag first: an in-flight handleCheckTriggerDelivered() reads it to decide
  // whether to re-arm, so clearing it before cancelling closes that race.
  await AsyncStorage.setItem(RUNNING_FLAG_KEY, 'false');
  await notifee.cancelTriggerNotifications([TRIGGER_NOTIFICATION_ID]);
  // The low-battery alert is `ongoing` (can't be swiped away) — without this
  // it stays stuck at its last percentage after logout.
  await clearAlertState();
  logger.debug('[batteryGuard] stopped');
}

export { TRIGGER_NOTIFICATION_ID as BATTERY_TRIGGER_NOTIFICATION_ID };
