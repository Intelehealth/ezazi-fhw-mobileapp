import { act, renderHook, waitFor } from '@testing-library/react-native';
import notifee from 'react-native-notify-kit';
import { useBatteryGuard, useDismissLowBatteryDialog } from '../index';
import {
  acknowledgeDialog,
  checkPendingDialog,
  handleCheckTriggerDelivered,
  startBatteryGuard,
  stopBatteryGuard,
} from '../batteryGuard';
import { useBatteryGuardStore } from '../batteryGuard.store';

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: { onForegroundEvent: jest.fn(() => jest.fn()) },
  EventType: { DELIVERED: 3 },
}));

jest.mock('../batteryGuard', () => ({
  BATTERY_TRIGGER_NOTIFICATION_ID: 'battery-guard-trigger',
  startBatteryGuard: jest.fn().mockResolvedValue(undefined),
  stopBatteryGuard: jest.fn().mockResolvedValue(undefined),
  checkPendingDialog: jest.fn().mockResolvedValue(null),
  acknowledgeDialog: jest.fn().mockResolvedValue(undefined),
  handleCheckTriggerDelivered: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/core/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

type ForegroundHandler = (event: { type: number; detail: { notification?: { id?: string } } }) => void;

function foregroundHandler(): ForegroundHandler {
  const calls = (notifee.onForegroundEvent as jest.Mock).mock.calls;
  return calls[calls.length - 1][0];
}

describe('useBatteryGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBatteryGuardStore.setState({ dialogVisible: false, dialogPercent: 0 });
  });

  it('does nothing while disabled', () => {
    renderHook(() => useBatteryGuard(false));

    expect(startBatteryGuard).not.toHaveBeenCalled();
    expect(notifee.onForegroundEvent).not.toHaveBeenCalled();
    expect(stopBatteryGuard).not.toHaveBeenCalled();
  });

  it('starts the guard once enabled', async () => {
    renderHook(() => useBatteryGuard(true));

    await waitFor(() => expect(startBatteryGuard).toHaveBeenCalledTimes(1));
  });

  it('shows a dialog that was left pending while the app was closed', async () => {
    (checkPendingDialog as jest.Mock).mockResolvedValueOnce(32);

    renderHook(() => useBatteryGuard(true));

    await waitFor(() =>
      expect(useBatteryGuardStore.getState()).toMatchObject({ dialogVisible: true, dialogPercent: 32 }),
    );
  });

  it('runs the check when its own trigger is delivered in the foreground, and ignores other notifications', async () => {
    renderHook(() => useBatteryGuard(true));
    const handler = foregroundHandler();

    handler({ type: 3, detail: { notification: { id: 'labour-monitor-trigger' } } });
    expect(handleCheckTriggerDelivered).not.toHaveBeenCalled();

    handler({ type: 3, detail: { notification: { id: 'battery-guard-trigger' } } });
    expect(handleCheckTriggerDelivered).toHaveBeenCalledTimes(1);
  });

  it('stops the guard and the foreground listener when disabled (logout)', async () => {
    const unsubscribe = jest.fn();
    (notifee.onForegroundEvent as jest.Mock).mockReturnValueOnce(unsubscribe);
    const { rerender } = renderHook(({ enabled }: { enabled: boolean }) => useBatteryGuard(enabled), {
      initialProps: { enabled: true },
    });

    await act(async () => {
      rerender({ enabled: false });
    });

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(stopBatteryGuard).toHaveBeenCalledTimes(1);
  });
});

describe('useDismissLowBatteryDialog', () => {
  beforeEach(() => jest.clearAllMocks());

  it('hides the dialog and clears the pending entry so it does not reappear on next open', async () => {
    useBatteryGuardStore.setState({ dialogVisible: true, dialogPercent: 34 });
    const { result } = renderHook(() => useDismissLowBatteryDialog());

    act(() => result.current());

    expect(useBatteryGuardStore.getState().dialogVisible).toBe(false);
    expect(acknowledgeDialog).toHaveBeenCalledTimes(1);
  });
});
