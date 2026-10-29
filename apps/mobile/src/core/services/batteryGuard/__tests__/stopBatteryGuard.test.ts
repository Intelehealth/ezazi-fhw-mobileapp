import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from 'react-native-notify-kit';
import { stopBatteryGuard } from '../batteryGuard';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    cancelTriggerNotifications: jest.fn().mockResolvedValue(undefined),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
  },
  AlarmType: {},
  AndroidImportance: {},
  TriggerType: {},
}));

jest.mock('expo-battery', () => ({}));

describe('stopBatteryGuard', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('marks the guard as not running so an in-flight delivery will not re-arm', async () => {
    await AsyncStorage.setItem('battery_guard_running', 'true');

    await stopBatteryGuard();

    expect(await AsyncStorage.getItem('battery_guard_running')).toBe('false');
  });

  it('cancels the scheduled check and the displayed (ongoing) low-battery notification', async () => {
    await stopBatteryGuard();

    expect(notifee.cancelTriggerNotifications).toHaveBeenCalledTimes(1);
    expect(notifee.cancelNotification).toHaveBeenCalledTimes(1);
  });
});
