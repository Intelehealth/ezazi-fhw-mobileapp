import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import notifee from 'react-native-notify-kit';

import { useMonitorService } from '../index';
import { cardAlarm } from '../cardAlarmNative';
import { scanAndRearm } from '../cardScheduler';

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: { cancelTriggerNotifications: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../cardAlarmNative', () => ({ cardAlarm: { start: jest.fn(), stop: jest.fn(), readWakeLog: jest.fn(() => []) } }));
jest.mock('../cardScheduler', () => ({ scanAndRearm: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../cardScanTask', () => ({ runCardScanTask: jest.fn() }));
jest.mock('@/core/utils/logger', () => ({ logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const native = cardAlarm as jest.Mocked<NonNullable<typeof cardAlarm>>;
let appStateListener: ((state: AppStateStatus) => void) | null = null;
const removeAppState = jest.fn();

describe('useMonitorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStateListener = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener as (state: AppStateStatus) => void;
      return { remove: removeAppState } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });

  it('does nothing while logged out', () => {
    renderHook(() => useMonitorService(false));

    expect(native.start).not.toHaveBeenCalled();
    expect(native.stop).not.toHaveBeenCalled();
    expect(scanAndRearm).not.toHaveBeenCalled();
  });

  it('on login: starts the alarms, cancels the old monitor triggers, and catches up', () => {
    renderHook(() => useMonitorService(true));

    expect(native.start).toHaveBeenCalledTimes(1);
    expect(notifee.cancelTriggerNotifications).toHaveBeenCalledWith(['labour-monitor-trigger', 'battery-guard-trigger']);
    expect(scanAndRearm).toHaveBeenCalledWith('login');
  });

  it('scans and re-arms on every return to the app', () => {
    renderHook(() => useMonitorService(true));

    act(() => appStateListener?.('background'));
    act(() => appStateListener?.('active'));

    expect(scanAndRearm).toHaveBeenLastCalledWith('resume');
    expect(scanAndRearm).toHaveBeenCalledTimes(2);
  });

  it('logout stops the alarms', () => {
    const { rerender } = renderHook(({ enabled }: { enabled: boolean }) => useMonitorService(enabled), {
      initialProps: { enabled: true },
    });

    rerender({ enabled: false });

    expect(native.stop).toHaveBeenCalledTimes(1);
    expect(removeAppState).toHaveBeenCalledTimes(1);
  });

  it('keeps running on unmount: the app swiped away while still logged in', () => {
    const { unmount } = renderHook(() => useMonitorService(true));

    unmount();

    expect(native.stop).not.toHaveBeenCalled();
    expect(removeAppState).toHaveBeenCalledTimes(1);
  });

  it('a failing native start or stop does not throw', () => {
    native.start.mockImplementationOnce(() => {
      throw new Error('no module');
    });
    native.stop.mockImplementationOnce(() => {
      throw new Error('no module');
    });
    const { rerender } = renderHook(({ enabled }: { enabled: boolean }) => useMonitorService(enabled), {
      initialProps: { enabled: true },
    });

    expect(() => rerender({ enabled: false })).not.toThrow();
  });
});
