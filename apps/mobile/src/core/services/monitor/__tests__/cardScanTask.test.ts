import { handleBatteryWake } from '@/core/services/batteryGuard/batteryGuard';

import { runCardScanTask } from '../cardScanTask';
import { scanAndRearm } from '../cardScheduler';

jest.mock('@/core/services/batteryGuard/batteryGuard', () => ({ handleBatteryWake: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../cardScheduler', () => ({ scanAndRearm: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/core/utils/logger', () => ({ logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const NOW = Date.UTC(2026, 10, 6, 10, 0, 0);

/** The JS task the native CardScanService runs after every wake-up. */
describe('runCardScanTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: NOW });
  });

  afterEach(() => jest.useRealTimers());

  it('woken 20 s early by the alarm clock: waits for the due second, then scans', async () => {
    const task = runCardScanTask({ reason: 'main', dueAt: NOW + 20_000 });

    await jest.advanceTimersByTimeAsync(19_999);
    expect(scanAndRearm).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    await task;
    expect(Date.now()).toBe(NOW + 20_000);
    expect(scanAndRearm).toHaveBeenCalledWith('main', NOW + 20_000);
  });

  it('never waits more than a minute (a wrong due time cannot hold the service)', async () => {
    const task = runCardScanTask({ reason: 'main', dueAt: NOW + 60 * 60_000 });

    await jest.advanceTimersByTimeAsync(60_000);
    await task;
    expect(scanAndRearm).toHaveBeenCalledTimes(1);
  });

  it('the watchdog and system wake-ups scan at once', async () => {
    await runCardScanTask({ reason: 'watchdog', dueAt: NOW - 120_000 });
    await runCardScanTask({ reason: 'boot', dueAt: 0 });

    expect(scanAndRearm).toHaveBeenNthCalledWith(1, 'watchdog', NOW - 120_000);
    expect(scanAndRearm).toHaveBeenNthCalledWith(2, 'boot', 0);
  });

  it('the battery alarm runs the battery check, not a card scan', async () => {
    await runCardScanTask({ reason: 'battery', dueAt: NOW });

    expect(handleBatteryWake).toHaveBeenCalledTimes(1);
    expect(scanAndRearm).not.toHaveBeenCalled();
  });

  it('never rejects, so the service always ends', async () => {
    (scanAndRearm as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    await expect(runCardScanTask({ reason: 'main', dueAt: NOW })).resolves.toBeUndefined();
  });
});
