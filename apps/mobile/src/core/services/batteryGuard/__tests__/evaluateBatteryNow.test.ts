import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import notifee from 'react-native-notify-kit';
import { evaluateBatteryNow } from '../batteryGuard';
import { useBatteryGuardStore } from '../batteryGuard.store';
import {
  BATTERY_ALERT_CHANNEL_ID,
  BATTERY_DIALOG_PENDING_KEY,
  BATTERY_DIALOG_SHOWN_KEY,
  BATTERY_LAST_NOTIFIED_PERCENT_KEY,
  BATTERY_NOTIFICATION_ID,
  BATTERY_SILENT_CHANNEL_ID,
} from '../constants';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    displayNotification: jest.fn().mockResolvedValue('id'),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
  },
  AlarmType: { SET_EXACT_AND_ALLOW_WHILE_IDLE: 1 },
  AndroidImportance: { MIN: 1, LOW: 2, DEFAULT: 3 },
  TriggerType: { TIMESTAMP: 0 },
}));

jest.mock('expo-battery', () => ({
  BatteryState: { UNKNOWN: 0, UNPLUGGED: 1, CHARGING: 2, FULL: 3, NOT_CHARGING: 4 },
  getPowerStateAsync: jest.fn(),
}));

jest.mock('@/core/i18n', () => ({
  i18n: { t: (key: string) => key },
}));

jest.mock('@/core/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { UNKNOWN, UNPLUGGED, CHARGING, FULL, NOT_CHARGING } = Battery.BatteryState;

function setPower(percent: number, batteryState: Battery.BatteryState = UNPLUGGED): void {
  (Battery.getPowerStateAsync as jest.Mock).mockResolvedValue({
    batteryLevel: percent < 0 ? -1 : percent / 100,
    batteryState,
  });
}

function lastNotification(): { android: { channelId: string; ongoing: boolean; autoCancel: boolean } } {
  const calls = (notifee.displayNotification as jest.Mock).mock.calls;
  return calls[calls.length - 1][0];
}

describe('evaluateBatteryNow', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useBatteryGuardStore.setState({ dialogVisible: false, dialogPercent: 0 });
  });

  it.each([
    ['CHARGING', CHARGING],
    ['FULL', FULL],
    ['NOT_CHARGING', NOT_CHARGING],
  ])('treats %s as plugged in: clears the alert state, shows nothing', async (_label, state) => {
    await AsyncStorage.multiSet([
      [BATTERY_DIALOG_SHOWN_KEY, 'true'],
      [BATTERY_DIALOG_PENDING_KEY, '33'],
      [BATTERY_LAST_NOTIFIED_PERCENT_KEY, '33'],
    ]);
    setPower(20, state);

    await evaluateBatteryNow();

    expect(notifee.cancelNotification).toHaveBeenCalledWith(BATTERY_NOTIFICATION_ID);
    expect(notifee.displayNotification).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(BATTERY_DIALOG_SHOWN_KEY)).toBe('false');
    expect(await AsyncStorage.getItem(BATTERY_DIALOG_PENDING_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(BATTERY_LAST_NOTIFIED_PERCENT_KEY)).toBeNull();
  });

  it('does nothing when the level is unknown (-1)', async () => {
    setPower(-1, UNKNOWN);

    await evaluateBatteryNow();

    expect(notifee.displayNotification).not.toHaveBeenCalled();
    expect(useBatteryGuardStore.getState().dialogVisible).toBe(false);
  });

  it('does nothing above the 35% dialog threshold', async () => {
    setPower(36);

    await evaluateBatteryNow();

    expect(notifee.displayNotification).not.toHaveBeenCalled();
    expect(useBatteryGuardStore.getState().dialogVisible).toBe(false);
  });

  it('at exactly 35%: shows the one-time dialog, persists it as pending, and posts a silent dismissable notification', async () => {
    setPower(35);

    await evaluateBatteryNow();

    expect(useBatteryGuardStore.getState()).toMatchObject({ dialogVisible: true, dialogPercent: 35 });
    expect(await AsyncStorage.getItem(BATTERY_DIALOG_SHOWN_KEY)).toBe('true');
    expect(await AsyncStorage.getItem(BATTERY_DIALOG_PENDING_KEY)).toBe('35');
    expect(lastNotification().android).toMatchObject({
      channelId: BATTERY_SILENT_CHANNEL_ID,
      ongoing: false,
      autoCancel: true,
    });
  });

  it('does not show the dialog a second time once it has been shown', async () => {
    setPower(35);
    await evaluateBatteryNow();
    useBatteryGuardStore.getState().hideDialog();

    setPower(34);
    await evaluateBatteryNow();

    expect(useBatteryGuardStore.getState().dialogVisible).toBe(false);
  });

  it('does not re-post the notification when the percent has not changed', async () => {
    setPower(33);
    await evaluateBatteryNow();
    await evaluateBatteryNow();

    expect(notifee.displayNotification).toHaveBeenCalledTimes(1);
  });

  it('posts one notification per 1% step', async () => {
    for (const percent of [34, 33, 32]) {
      setPower(percent);
      await evaluateBatteryNow();
    }

    expect(notifee.displayNotification).toHaveBeenCalledTimes(3);
  });

  it.each([30, 20, 10])('at the %i%% milestone: alert channel (sound) and ongoing', async (percent) => {
    setPower(percent);

    await evaluateBatteryNow();

    expect(lastNotification().android).toMatchObject({
      channelId: BATTERY_ALERT_CHANNEL_ID,
      ongoing: true,
      autoCancel: false,
    });
  });

  it('below 30% between milestones: silent channel, but still ongoing', async () => {
    setPower(29);

    await evaluateBatteryNow();

    expect(lastNotification().android).toMatchObject({
      channelId: BATTERY_SILENT_CHANNEL_ID,
      ongoing: true,
      autoCancel: false,
    });
  });

  it('does not throw when posting the notification fails', async () => {
    (notifee.displayNotification as jest.Mock).mockRejectedValueOnce(new Error('native failure'));
    setPower(33);

    await expect(evaluateBatteryNow()).resolves.toBeUndefined();
  });
});
