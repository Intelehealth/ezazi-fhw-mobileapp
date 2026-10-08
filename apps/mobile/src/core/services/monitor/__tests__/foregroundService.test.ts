import notifee from 'react-native-notify-kit';
import { MONITOR_CHANNEL_ID, MONITOR_NOTIFICATION_ID, MONITOR_TICK_INTERVAL_MS } from '../constants';

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    registerForegroundService: jest.fn(),
    requestPermission: jest.fn().mockResolvedValue(undefined),
    createChannel: jest.fn().mockResolvedValue('channel'),
    displayNotification: jest.fn().mockResolvedValue('id'),
    stopForegroundService: jest.fn().mockResolvedValue(undefined),
  },
  AndroidForegroundServiceType: { FOREGROUND_SERVICE_TYPE_DATA_SYNC: 1 },
  AndroidImportance: { LOW: 2 },
}));

jest.mock('@/core/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// The module keeps its tick count / timer / service resolver at module scope,
// so each test loads a fresh copy rather than inheriting the previous test's state.
type ForegroundServiceModule = typeof import('../foregroundService');
let service: ForegroundServiceModule;

/** Registers the runner and returns the function Android would invoke to start the service. */
function registerAndGetRunner(): () => Promise<void> {
  service.registerMonitorForegroundServiceHandler();
  const calls = (notifee.registerForegroundService as jest.Mock).mock.calls;
  return calls[calls.length - 1][0];
}

describe('foregroundService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.isolateModules(() => {
      service = require('../foregroundService');
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('startMonitorService asks for permission, creates the channel, then promotes to a foreground service', async () => {
    await service.startMonitorService();

    expect(notifee.requestPermission).toHaveBeenCalledTimes(1);
    expect(notifee.createChannel).toHaveBeenCalledWith(expect.objectContaining({ id: MONITOR_CHANNEL_ID }));
    expect(notifee.displayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: MONITOR_NOTIFICATION_ID,
        android: expect.objectContaining({ asForegroundService: true, ongoing: true }),
      }),
    );
  });

  it('the registered runner ticks once immediately, then every MONITOR_TICK_INTERVAL_MS', async () => {
    const runner = registerAndGetRunner();
    void runner();

    expect(service.getTickCount()).toBe(1);

    await jest.advanceTimersByTimeAsync(MONITOR_TICK_INTERVAL_MS * 2);

    expect(service.getTickCount()).toBe(3);
  });

  it('per-tick updates do not restate the foreground-service fields', async () => {
    const runner = registerAndGetRunner();
    void runner();
    await jest.advanceTimersByTimeAsync(MONITOR_TICK_INTERVAL_MS);

    const tickCalls = (notifee.displayNotification as jest.Mock).mock.calls;
    expect(tickCalls.length).toBeGreaterThan(0);
    tickCalls.forEach(([notification]) => {
      expect(notification.android.asForegroundService).toBeUndefined();
      expect(notification.android.foregroundServiceTypes).toBeUndefined();
    });
  });

  it('notifies tick subscribers, and stops notifying once unsubscribed', async () => {
    const listener = jest.fn();
    const unsubscribe = service.subscribeTickCount(listener);
    const runner = registerAndGetRunner();
    void runner();

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await jest.advanceTimersByTimeAsync(MONITOR_TICK_INTERVAL_MS);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stopMonitorService stops ticking, resets the count, ends the service task and the native service', async () => {
    const runner = registerAndGetRunner();
    let taskFinished = false;
    void runner().then(() => {
      taskFinished = true;
    });

    await service.stopMonitorService();
    await jest.advanceTimersByTimeAsync(MONITOR_TICK_INTERVAL_MS * 3);

    expect(service.getTickCount()).toBe(0);
    expect(taskFinished).toBe(true);
    expect(notifee.stopForegroundService).toHaveBeenCalledTimes(1);
  });

  it('keeps ticking when a heartbeat update fails', async () => {
    (notifee.displayNotification as jest.Mock).mockRejectedValueOnce(new Error('native failure'));
    const runner = registerAndGetRunner();
    void runner();

    await jest.advanceTimersByTimeAsync(MONITOR_TICK_INTERVAL_MS);

    expect(service.getTickCount()).toBe(2);
  });

  it('a second runner invocation does not start a second timer', async () => {
    const runner = registerAndGetRunner();
    void runner();
    void runner();

    await jest.advanceTimersByTimeAsync(MONITOR_TICK_INTERVAL_MS);

    // 1 immediate tick + 1 interval tick. A duplicate timer would make this 3+.
    expect(service.getTickCount()).toBe(2);
  });
});
