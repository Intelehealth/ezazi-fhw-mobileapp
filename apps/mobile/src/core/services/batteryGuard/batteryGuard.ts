import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import notifee, { AndroidImportance } from 'react-native-notify-kit';
import { i18n } from '@/core/i18n';
import { cardAlarm } from '@/core/services/monitor/cardAlarmNative';
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
import { nowMs } from '@/core/utils/datetime';

/**
 * Low-battery alert — separate state (own channels, notification id and AsyncStorage keys) from the card
 * engine, but woken by the same native alarm module (modules/card-alarm, BATTERY slot), whose short
 * foreground service keeps the app awake while the check runs.
 *
 * `expo-battery`'s addBatteryLevelListener only fires on the OS's BATTERY_LOW / BATTERY_OKAY broadcasts,
 * far too coarse for a warning per percent between 35 and 30, so the level is polled on an exact alarm.
 * Every 5 minutes (2026-11-06; it was every minute, which used most of the 72 alarms an hour Android
 * allows an app while the screen is off, CARD_ENGINE_ALARM_PLAN.md §3). A sound level crossed between two
 * checks still sounds. addBatteryStateListener (plug/unplug) is a plain listener for an immediate reaction.
 */

const RUNNING_FLAG_KEY = 'battery_guard_running';

const CHECK_INTERVAL_MS = 5 * 60_000;

async function ensureChannels(): Promise<void> {
  await notifee.createChannel({
    id: BATTERY_SILENT_CHANNEL_ID,
    name: i18n.t('batteryGuard.channel.silent'),
    importance: AndroidImportance.LOW,
  });
  await notifee.createChannel({
    id: BATTERY_ALERT_CHANNEL_ID,
    name: i18n.t('batteryGuard.channel.urgent'),
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
    vibration: true,
  });
}

function armNextCheck(): void {
  try {
    cardAlarm?.armBattery(nowMs() + CHECK_INTERVAL_MS);
  } catch (error) {
    logger.error('[batteryGuard] arming the next check failed', error);
  }
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
  // A sound level reached, or passed since the last warning (checks are 5 minutes apart).
  const playSound = SOUND_MILESTONE_PERCENTS.some(
    (milestone) => percent === milestone || (lastNotified !== null && lastNotified > milestone && percent < milestone),
  );

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

/** The battery alarm rang (monitor/cardScanTask.ts): check, then arm the next check while still running. */
export async function handleBatteryWake(): Promise<void> {
  try {
    await evaluateBatteryNow();
  } finally {
    const stillRunning = (await AsyncStorage.getItem(RUNNING_FLAG_KEY)) === 'true';
    if (stillRunning) armNextCheck();
  }
}

let activeStateSubscription: ReturnType<typeof Battery.addBatteryStateListener> | null = null;

export async function startBatteryGuard(): Promise<void> {
  await ensureChannels();
  await AsyncStorage.setItem(RUNNING_FLAG_KEY, 'true');
  try {
    cardAlarm?.start(); // idempotent: the monitor starts it too, on the same login
  } catch (error) {
    logger.error('[batteryGuard] alarm module start failed', error);
  }
  await evaluateBatteryNow();
  armNextCheck();

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
  // Flag first: an in-flight handleBatteryWake() reads it to decide
  // whether to re-arm, so clearing it before cancelling closes that race.
  await AsyncStorage.setItem(RUNNING_FLAG_KEY, 'false');
  try {
    cardAlarm?.disarmBattery();
  } catch (error) {
    logger.error('[batteryGuard] cancelling the check alarm failed', error);
  }
  // The low-battery alert is `ongoing` (can't be swiped away) — without this
  // it stays stuck at its last percentage after logout.
  await clearAlertState();
  logger.debug('[batteryGuard] stopped');
}

