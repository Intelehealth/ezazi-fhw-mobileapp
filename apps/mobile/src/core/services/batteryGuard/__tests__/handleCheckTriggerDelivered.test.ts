import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from 'react-native-notify-kit';
import { handleCheckTriggerDelivered, BATTERY_TRIGGER_NOTIFICATION_ID } from '../batteryGuard';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    cancelDisplayedNotification: jest.fn().mockResolvedValue(undefined),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    createTriggerNotification: jest.fn().mockResolvedValue('id'),
  },
  AlarmType: { SET_EXACT_AND_ALLOW_WHILE_IDLE: 1 },
  AndroidImportance: { MIN: 1, LOW: 2, DEFAULT: 3 },
  TriggerType: { TIMESTAMP: 0 },
}));

// Plugged in and charging: evaluateBatteryNow() takes its "clear alert state" path.
jest.mock('expo-battery', () => ({
  BatteryState: { UNKNOWN: 0, UNPLUGGED: 1, CHARGING: 2, FULL: 3, NOT_CHARGING: 4 },
  getPowerStateAsync: jest.fn().mockResolvedValue({ batteryLevel: 0.9, batteryState: 2 }),
}));

describe('handleCheckTriggerDelivered', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('dismisses the displayed "Battery check" notification, then re-arms while running', async () => {
    await AsyncStorage.setItem('battery_guard_running', 'true');

    await handleCheckTriggerDelivered();

    expect(notifee.cancelDisplayedNotification).toHaveBeenCalledWith(BATTERY_TRIGGER_NOTIFICATION_ID);
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  });

  it('does not re-arm once stopped', async () => {
    await AsyncStorage.setItem('battery_guard_running', 'false');

    await handleCheckTriggerDelivered();

    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
  });

  it('still checks and re-arms when dismissing the notification fails', async () => {
    await AsyncStorage.setItem('battery_guard_running', 'true');
    (notifee.cancelDisplayedNotification as jest.Mock).mockRejectedValueOnce(new Error('native failure'));

    await handleCheckTriggerDelivered();

    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  });
});
