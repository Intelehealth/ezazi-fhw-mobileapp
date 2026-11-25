import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useBatteryGuard, useDismissLowBatteryDialog } from '../index';
import { acknowledgeDialog, checkPendingDialog, startBatteryGuard, stopBatteryGuard } from '../batteryGuard';
import { useBatteryGuardStore } from '../batteryGuard.store';

jest.mock('../batteryGuard', () => ({
  startBatteryGuard: jest.fn().mockResolvedValue(undefined),
  stopBatteryGuard: jest.fn().mockResolvedValue(undefined),
  checkPendingDialog: jest.fn().mockResolvedValue(null),
  acknowledgeDialog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/core/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('useBatteryGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBatteryGuardStore.setState({ dialogVisible: false, dialogPercent: 0 });
  });

  it('does nothing while disabled', () => {
    renderHook(() => useBatteryGuard(false));

    expect(startBatteryGuard).not.toHaveBeenCalled();
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

  it('stops the guard when disabled (logout)', async () => {
    const { rerender } = renderHook(({ enabled }: { enabled: boolean }) => useBatteryGuard(enabled), {
      initialProps: { enabled: true },
    });

    await act(async () => {
      rerender({ enabled: false });
    });

    expect(stopBatteryGuard).toHaveBeenCalledTimes(1);
  });

  it('keeps the guard running on unmount (the app swiped away while still logged in)', async () => {
    const { unmount } = renderHook(() => useBatteryGuard(true));

    await act(async () => {
      unmount();
    });

    expect(stopBatteryGuard).not.toHaveBeenCalled();
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
