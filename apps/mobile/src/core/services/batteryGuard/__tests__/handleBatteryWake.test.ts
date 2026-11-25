import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';

import { cardAlarm } from '@/core/services/monitor/cardAlarmNative';

import { handleBatteryWake } from '../batteryGuard';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: { displayNotification: jest.fn(), cancelNotification: jest.fn().mockResolvedValue(undefined) },
  AndroidImportance: {},
}));
jest.mock('expo-battery', () => ({
  BatteryState: { UNKNOWN: 0, UNPLUGGED: 1, CHARGING: 2, FULL: 3, NOT_CHARGING: 4 },
  getPowerStateAsync: jest.fn(),
}));
jest.mock('@/core/services/monitor/cardAlarmNative', () => ({ cardAlarm: { armBattery: jest.fn() } }));
jest.mock('@/core/i18n', () => ({ i18n: { t: (key: string) => key } }));
jest.mock('@/core/utils/logger', () => ({ logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const NOW = Date.UTC(2026, 10, 6, 10, 0, 0);

/** The 5-minute battery alarm (monitor/cardScanTask.ts): check, then the next check while running. */
describe('handleBatteryWake', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: NOW });
    await AsyncStorage.clear();
    (Battery.getPowerStateAsync as jest.Mock).mockResolvedValue({ batteryLevel: 0.8, batteryState: 1 });
  });

  afterEach(() => jest.useRealTimers());

  it('checks the level and arms the next check 5 minutes later while running', async () => {
    await AsyncStorage.setItem('battery_guard_running', 'true');

    await handleBatteryWake();

    expect(Battery.getPowerStateAsync).toHaveBeenCalledTimes(1);
    expect(cardAlarm!.armBattery).toHaveBeenCalledWith(NOW + 5 * 60_000);
  });

  it('arms nothing after logout', async () => {
    await AsyncStorage.setItem('battery_guard_running', 'false');

    await handleBatteryWake();

    expect(cardAlarm!.armBattery).not.toHaveBeenCalled();
  });

  it('a failed check still arms the next one', async () => {
    await AsyncStorage.setItem('battery_guard_running', 'true');
    (Battery.getPowerStateAsync as jest.Mock).mockRejectedValueOnce(new Error('battery service'));

    await expect(handleBatteryWake()).rejects.toThrow('battery service');
    expect(cardAlarm!.armBattery).toHaveBeenCalledTimes(1);
  });
});
