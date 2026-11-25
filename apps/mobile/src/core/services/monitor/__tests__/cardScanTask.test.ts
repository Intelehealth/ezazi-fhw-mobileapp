import { handleBatteryWake } from '@/core/services/batteryGuard/batteryGuard';

import { cardAlarm } from '../cardAlarmNative';
import { runCardScanTask } from '../cardScanTask';
import { scanAndRearm } from '../cardScheduler';

jest.mock('@/core/services/batteryGuard/batteryGuard', () => ({ handleBatteryWake: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../cardScheduler', () => ({ scanAndRearm: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../cardAlarmNative', () => ({ cardAlarm: { nextDueAt: jest.fn(() => 0) } }));
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

  it('the battery alarm runs the battery check, and no card scan while no card is overdue', async () => {
    (cardAlarm!.nextDueAt as jest.Mock).mockReturnValue(NOW + 60_000);
    await runCardScanTask({ reason: 'battery', dueAt: NOW });

    expect(handleBatteryWake).toHaveBeenCalledTimes(1);
    expect(scanAndRearm).not.toHaveBeenCalled();
  });

  it('the battery alarm also creates a card the main wake-up missed (more than 3 s overdue)', async () => {
    (cardAlarm!.nextDueAt as jest.Mock).mockReturnValue(NOW - 3000);
    await runCardScanTask({ reason: 'battery', dueAt: NOW });

    expect(handleBatteryWake).toHaveBeenCalledTimes(1);
    expect(scanAndRearm).toHaveBeenCalledWith('battery', NOW - 3000);
  });

  it('leaves a card that is only just due to the main wake-up in progress', async () => {
    (cardAlarm!.nextDueAt as jest.Mock).mockReturnValue(NOW - 2999);
    await runCardScanTask({ reason: 'battery', dueAt: NOW });

    expect(scanAndRearm).not.toHaveBeenCalled();
  });

  it('nothing armed (no visit, or logged out): no card scan', async () => {
    (cardAlarm!.nextDueAt as jest.Mock).mockReturnValue(0);
    await runCardScanTask({ reason: 'battery', dueAt: NOW });

    expect(scanAndRearm).not.toHaveBeenCalled();
  });

  it('every card wake also runs the battery check, after the card scan', async () => {
    const order: string[] = [];
    (scanAndRearm as jest.Mock).mockImplementationOnce(async () => void order.push('scan'));
    (handleBatteryWake as jest.Mock).mockImplementationOnce(async () => void order.push('battery'));

    await runCardScanTask({ reason: 'boot', dueAt: 0 });

    expect(order).toEqual(['scan', 'battery']);
  });

  it.each(['main', 'watchdog', 'catchUp', 'boot', 'update', 'clock', 'exactAccess'])(
    '%s wake re-arms the battery check',
    async (reason) => {
      await runCardScanTask({ reason, dueAt: NOW });

      expect(handleBatteryWake).toHaveBeenCalledTimes(1);
    },
  );

  it('a failed card scan still runs the battery check', async () => {
    (scanAndRearm as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    await runCardScanTask({ reason: 'watchdog', dueAt: NOW });

    expect(handleBatteryWake).toHaveBeenCalledTimes(1);
  });

  it('a failed battery check does not reject', async () => {
    (handleBatteryWake as jest.Mock).mockRejectedValueOnce(new Error('battery service'));

    await expect(runCardScanTask({ reason: 'boot', dueAt: 0 })).resolves.toBeUndefined();
    expect(scanAndRearm).toHaveBeenCalledWith('boot', 0);
  });

  it('never rejects, so the service always ends', async () => {
    (scanAndRearm as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    await expect(runCardScanTask({ reason: 'main', dueAt: NOW })).resolves.toBeUndefined();
  });
});
