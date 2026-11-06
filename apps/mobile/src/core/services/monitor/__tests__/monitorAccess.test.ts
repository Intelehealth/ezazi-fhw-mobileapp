import { AppState, type AppStateStatus } from 'react-native';
import notifee from 'react-native-notify-kit';
import { logger } from '@/core/utils/logger';
import { askForExactAlarms, isExactAlarmAllowed } from '../monitorAccess';
import { MONITOR_SETTINGS_OPEN_TIMEOUT_MS } from '../constants';

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    getNotificationSettings: jest.fn(),
    openAlarmPermissionSettings: jest.fn().mockResolvedValue(undefined),
  },
  AndroidNotificationSetting: { NOT_SUPPORTED: -1, DISABLED: 0, ENABLED: 1 },
}));

jest.mock('@/core/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const alarm = (value: number) =>
  (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({ android: { alarm: value } });

let appStateListener: ((state: AppStateStatus) => void) | null = null;
const removeListener = jest.fn();
const flush = () => new Promise<void>((resolve) => jest.requireActual<typeof globalThis>('timers').setImmediate(resolve));

/** Exact alarms: allowed check, and the splash-time trip to "Alarms & reminders" that never blocks the app. */
describe('monitorAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    appStateListener = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener as (state: AppStateStatus) => void;
      return { remove: removeListener } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => jest.useRealTimers());

  it('treats only DISABLED as not allowed (NOT_SUPPORTED is an Android without the setting)', async () => {
    alarm(0);
    expect(await isExactAlarmAllowed()).toBe(false);
    alarm(1);
    expect(await isExactAlarmAllowed()).toBe(true);
    alarm(-1);
    expect(await isExactAlarmAllowed()).toBe(true);
  });

  it('does nothing when exact alarms are already allowed', async () => {
    alarm(1);
    await askForExactAlarms();
    expect(notifee.openAlarmPermissionSettings).not.toHaveBeenCalled();
  });

  it('opens the settings page and resolves once the user is back in the app', async () => {
    alarm(0);
    let done = false;
    void askForExactAlarms().then(() => (done = true));
    await flush();

    expect(notifee.openAlarmPermissionSettings).toHaveBeenCalledTimes(1);
    appStateListener?.('background');
    jest.advanceTimersByTime(MONITOR_SETTINGS_OPEN_TIMEOUT_MS * 10);
    await flush();
    expect(done).toBe(false);

    appStateListener?.('active');
    await flush();
    expect(done).toBe(true);
    expect(removeListener).toHaveBeenCalled();
  });

  it('goes on when the settings page never opened', async () => {
    alarm(0);
    let done = false;
    void askForExactAlarms().then(() => (done = true));
    await flush();

    jest.advanceTimersByTime(MONITOR_SETTINGS_OPEN_TIMEOUT_MS);
    await flush();
    expect(done).toBe(true);
  });

  it('never rejects: a failed check or a failed open is logged and the app goes on', async () => {
    (notifee.getNotificationSettings as jest.Mock).mockRejectedValueOnce(new Error('no module'));
    await expect(askForExactAlarms()).resolves.toBeUndefined();

    alarm(0);
    (notifee.openAlarmPermissionSettings as jest.Mock).mockRejectedValueOnce(new Error('no activity'));
    await expect(askForExactAlarms()).resolves.toBeUndefined();
    expect(removeListener).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(2);
  });
});

