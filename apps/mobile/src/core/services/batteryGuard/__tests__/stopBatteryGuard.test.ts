import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from 'react-native-notify-kit';
import { cardAlarm } from '@/core/services/monitor/cardAlarmNative';
import { stopBatteryGuard } from '../batteryGuard';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    cancelNotification: jest.fn().mockResolvedValue(undefined),
  },
  AndroidImportance: {},
}));

jest.mock('@/core/services/monitor/cardAlarmNative', () => ({ cardAlarm: { disarmBattery: jest.fn() } }));

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

  it('cancels the check alarm and the displayed (ongoing) low-battery notification', async () => {
    await stopBatteryGuard();

    expect(cardAlarm!.disarmBattery).toHaveBeenCalledTimes(1);
    expect(notifee.cancelNotification).toHaveBeenCalledTimes(1);
  });

  it('clears the running flag before cancelling the alarm (an in-flight check then does not re-arm)', async () => {
    await AsyncStorage.setItem('battery_guard_running', 'true');
    (cardAlarm!.disarmBattery as jest.Mock).mockImplementationOnce(() => {
      void AsyncStorage.getItem('battery_guard_running').then((value) => expect(value).toBe('false'));
    });

    await stopBatteryGuard();
    expect(cardAlarm!.disarmBattery).toHaveBeenCalledTimes(1);
  });
});
