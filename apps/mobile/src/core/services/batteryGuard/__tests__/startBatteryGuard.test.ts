import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import notifee from 'react-native-notify-kit';

import { cardAlarm } from '@/core/services/monitor/cardAlarmNative';

import { startBatteryGuard, stopBatteryGuard } from '../batteryGuard';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn().mockResolvedValue(undefined),
    displayNotification: jest.fn().mockResolvedValue(undefined),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
  },
  AndroidImportance: { LOW: 2, DEFAULT: 3 },
}));
jest.mock('expo-battery', () => ({
  BatteryState: { UNKNOWN: 0, UNPLUGGED: 1, CHARGING: 2, FULL: 3, NOT_CHARGING: 4 },
  getPowerStateAsync: jest.fn(),
  addBatteryStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('@/core/services/monitor/cardAlarmNative', () => ({
  cardAlarm: { start: jest.fn(), armBattery: jest.fn(), disarmBattery: jest.fn() },
}));
jest.mock('@/core/utils/logger', () => ({ logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const NOW = Date.UTC(2026, 10, 18, 10, 0, 0);

/** Login: channels from en.json, the running flag, a first check, and the 5-minute alarm. */
describe('startBatteryGuard', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: NOW });
    await AsyncStorage.clear();
    (Battery.getPowerStateAsync as jest.Mock).mockResolvedValue({ batteryLevel: 0.8, batteryState: 1 });
  });

  afterEach(() => jest.useRealTimers());

  it('creates the two warning channels with translated names, checks once and arms the next check', async () => {
    await startBatteryGuard();

    const names = (notifee.createChannel as jest.Mock).mock.calls.map((call) => call[0].name);
    expect(names).toEqual(['Battery warnings', 'Battery warnings (urgent)']);
    expect(await AsyncStorage.getItem('battery_guard_running')).toBe('true');
    expect(Battery.getPowerStateAsync).toHaveBeenCalledTimes(1);
    expect(cardAlarm!.start).toHaveBeenCalled();
    expect(cardAlarm!.armBattery).toHaveBeenCalledWith(NOW + 5 * 60_000);
  });

  it('listens for plug / unplug, and stops listening on logout', async () => {
    const remove = jest.fn();
    (Battery.addBatteryStateListener as jest.Mock).mockReturnValueOnce({ remove });
    await startBatteryGuard();
    expect(Battery.addBatteryStateListener).toHaveBeenCalledTimes(1);

    await stopBatteryGuard();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('a failing alarm module does not stop the guard from starting', async () => {
    (cardAlarm!.start as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no module');
    });
    await expect(startBatteryGuard()).resolves.toBeUndefined();
    expect(cardAlarm!.armBattery).toHaveBeenCalled();
  });
});
