import { AppState } from 'react-native';
import notifee, { AndroidNotificationSetting } from 'react-native-notify-kit';
import { logger } from '@/core/utils/logger';
import { MONITOR_SETTINGS_OPEN_TIMEOUT_MS } from './constants';

/**
 * Exact alarms ("Alarms & reminders"). Without them every card alarm is inexact and can be minutes late
 * (2026-11-01 device run). It is not a runtime permission: Android only lets the user switch it on in its
 * settings page, which Play allows an app to open. The splash screen requires it, as Android does since
 * da07197 (2026-11-03).
 */
export async function isExactAlarmAllowed(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  // NOT_SUPPORTED: an Android version without the setting, where exact alarms are always allowed.
  return settings.android.alarm !== AndroidNotificationSetting.DISABLED;
}

/** Resolves when the app is back in front after leaving it, or at once if it never left within the timeout. */
function waitForReturnToApp(): { done: Promise<void>; cancel: () => void } {
  let leftApp = false;
  let cancel = () => {};
  const done = new Promise<void>((resolve) => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') leftApp = true;
      else if (leftApp) finish();
    });
    // The settings page never opened: go on rather than wait forever.
    const timer = setTimeout(() => {
      if (!leftApp) finish();
    }, MONITOR_SETTINGS_OPEN_TIMEOUT_MS);
    function finish() {
      subscription.remove();
      clearTimeout(timer);
      resolve();
    }
    cancel = finish;
  });
  return { done, cancel };
}

/**
 * Splash, after the runtime permissions: when exact alarms are off, opens eZAZI's "Alarms & reminders" page
 * and resolves once the user is back in the app. Never blocks the app: a refusal or an error just goes on,
 * and the next app start asks again.
 */
export async function askForExactAlarms(): Promise<void> {
  try {
    if (await isExactAlarmAllowed()) return;
    const returnToApp = waitForReturnToApp();
    try {
      await notifee.openAlarmPermissionSettings();
    } catch (error) {
      returnToApp.cancel();
      throw error;
    }
    await returnToApp.done;
  } catch (error) {
    logger.error('[monitor] exact-alarm request failed', error);
  }
}

