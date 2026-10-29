import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useMonitorService } from '../index';
import { startMonitorService, stopMonitorService } from '../foregroundService';
import { startBackboneAlerts, stopBackboneAlerts } from '../backboneTrigger';

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: { onForegroundEvent: jest.fn(() => jest.fn()) },
  EventType: { DELIVERED: 3 },
}));

jest.mock('../foregroundService', () => ({
  startMonitorService: jest.fn().mockResolvedValue(undefined),
  stopMonitorService: jest.fn().mockResolvedValue(undefined),
  getTickCount: jest.fn(),
  subscribeTickCount: jest.fn(),
  registerMonitorForegroundServiceHandler: jest.fn(),
}));

jest.mock('../backboneTrigger', () => ({
  startBackboneAlerts: jest.fn().mockResolvedValue(undefined),
  stopBackboneAlerts: jest.fn().mockResolvedValue(undefined),
  handleTriggerDelivered: jest.fn(),
  getBackboneStatus: jest.fn(),
}));

describe('useMonitorService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does nothing while disabled', () => {
    renderHook(() => useMonitorService(false));

    expect(startMonitorService).not.toHaveBeenCalled();
    expect(startBackboneAlerts).not.toHaveBeenCalled();
    expect(stopMonitorService).not.toHaveBeenCalled();
  });

  it('starts the heartbeat and the alarm chain once enabled', async () => {
    renderHook(() => useMonitorService(true));

    await waitFor(() => expect(startBackboneAlerts).toHaveBeenCalledTimes(1));
    expect(startMonitorService).toHaveBeenCalledTimes(1);
  });

  it('stops both the service and the alarm chain when disabled (logout)', async () => {
    const { rerender } = renderHook(({ enabled }: { enabled: boolean }) => useMonitorService(enabled), {
      initialProps: { enabled: true },
    });
    await waitFor(() => expect(startBackboneAlerts).toHaveBeenCalled());

    await act(async () => {
      rerender({ enabled: false });
    });

    await waitFor(() => {
      expect(stopBackboneAlerts).toHaveBeenCalled();
      expect(stopMonitorService).toHaveBeenCalled();
    });
  });

  it('stops everything on unmount', async () => {
    const { unmount } = renderHook(() => useMonitorService(true));
    await waitFor(() => expect(startBackboneAlerts).toHaveBeenCalled());

    await act(async () => {
      unmount();
    });

    await waitFor(() => {
      expect(stopBackboneAlerts).toHaveBeenCalled();
      expect(stopMonitorService).toHaveBeenCalled();
    });
  });

  it('still stops the alarm chain if stopping the foreground service throws', async () => {
    (stopMonitorService as jest.Mock).mockRejectedValueOnce(new Error('native failure'));
    const { unmount } = renderHook(() => useMonitorService(true));
    await waitFor(() => expect(startBackboneAlerts).toHaveBeenCalled());

    await act(async () => {
      unmount();
    });

    await waitFor(() => expect(stopBackboneAlerts).toHaveBeenCalled());
  });
});
