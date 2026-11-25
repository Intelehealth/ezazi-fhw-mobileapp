import { runCardScan, type ScanResult } from '@/core/services/cardGeneration';

import { cardAlarm } from '../cardAlarmNative';
import { scanAndRearm } from '../cardScheduler';

jest.mock('@/core/services/cardGeneration', () => ({ runCardScan: jest.fn() }));
jest.mock('../cardAlarmNative', () => ({
  cardAlarm: { armCards: jest.fn(() => 'alarmClock'), disarmCards: jest.fn(), appendWakeLog: jest.fn() },
}));
jest.mock('@/core/utils/logger', () => ({ logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const NOW = Date.UTC(2026, 10, 6, 10, 0, 0);
const SECOND = 1000;
const MINUTE = 60_000;
const native = cardAlarm as jest.Mocked<NonNullable<typeof cardAlarm>>;

const result = (nextDueAt: number | null, cardsCreated = 0): ScanResult => ({
  cardsCreated,
  decisionPendingSet: 0,
  missedMarkers: 0,
  preSyncDue: 0,
  duplicatesSkipped: 0,
  nextDueAt,
});

/** After every scan: the alarm clock just before the next due card, the watchdog after it. */
describe('scanAndRearm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: NOW });
  });

  afterEach(() => jest.useRealTimers());

  it('arms the alarm clock 20 s before the next due card and the watchdog 2 min after it', async () => {
    (runCardScan as jest.Mock).mockResolvedValue(result(NOW + 30 * MINUTE, 1));

    await scanAndRearm('main', NOW);

    expect(runCardScan).toHaveBeenCalledWith(NOW);
    expect(native.armCards).toHaveBeenCalledWith(NOW + 30 * MINUTE, NOW + 30 * MINUTE - 20 * SECOND, NOW + 32 * MINUTE);
  });

  it('a card due within 20 s gets its alarm a second from now, never in the past', async () => {
    (runCardScan as jest.Mock).mockResolvedValue(result(NOW + 5 * SECOND));

    await scanAndRearm('resume');

    expect(native.armCards).toHaveBeenCalledWith(NOW + 5 * SECOND, NOW + SECOND, NOW + 5 * SECOND + 2 * MINUTE);
  });

  it('cancels the card alarms when no card is coming (no visit, or Decision Pending set)', async () => {
    (runCardScan as jest.Mock).mockResolvedValue(result(null));

    await scanAndRearm('main');

    expect(native.disarmCards).toHaveBeenCalledTimes(1);
    expect(native.armCards).not.toHaveBeenCalled();
  });

  it('cancels the card alarms when nobody is logged in (no scan)', async () => {
    (runCardScan as jest.Mock).mockResolvedValue(null);

    await scanAndRearm('boot');

    expect(native.disarmCards).toHaveBeenCalledTimes(1);
  });

  it('scans again at once while a card is still due, at most twice, then retries in a minute', async () => {
    (runCardScan as jest.Mock).mockResolvedValue(result(NOW - SECOND));

    await scanAndRearm('watchdog');

    expect(runCardScan).toHaveBeenCalledTimes(3);
    expect(native.armCards).toHaveBeenCalledWith(NOW + MINUTE, NOW + MINUTE, NOW + 3 * MINUTE);
  });

  it('stops rescanning as soon as nothing is due any more', async () => {
    (runCardScan as jest.Mock).mockResolvedValueOnce(result(NOW)).mockResolvedValueOnce(result(NOW + 15 * MINUTE, 1));

    await scanAndRearm('main', NOW);

    expect(runCardScan).toHaveBeenCalledTimes(2);
    expect(native.armCards).toHaveBeenCalledWith(NOW + 15 * MINUTE, NOW + 15 * MINUTE - 20 * SECOND, NOW + 17 * MINUTE);
  });

  it('a failed scan still arms a retry, so the chain of alarms never ends', async () => {
    (runCardScan as jest.Mock).mockRejectedValue(new Error('db busy'));

    await expect(scanAndRearm('main', NOW)).resolves.toBeUndefined();

    expect(native.armCards).toHaveBeenCalledWith(NOW + MINUTE, NOW + MINUTE, NOW + 3 * MINUTE);
    expect(native.appendWakeLog).toHaveBeenCalledWith('scanFailed reason=main');
  });

  it('an alarm that fails to arm does not throw', async () => {
    (runCardScan as jest.Mock).mockResolvedValue(result(NOW + MINUTE));
    native.armCards.mockImplementationOnce(() => {
      throw new Error('alarm service');
    });

    await expect(scanAndRearm('main')).resolves.toBeUndefined();
  });

  it('logs each wake-up with how late the scan ran against its due time', async () => {
    (runCardScan as jest.Mock).mockResolvedValue(result(NOW + 30 * MINUTE, 1));

    await scanAndRearm('main', NOW - 250);

    expect(native.appendWakeLog).toHaveBeenCalledWith(
      `scan reason=main due=${NOW - 250} vsDue=250ms cards=1 next=${NOW + 30 * MINUTE}`,
    );
  });

  it('runs calls one after another, so the alarms always follow the latest scan', async () => {
    const order: string[] = [];
    let finishFirst: (value: ScanResult) => void = () => undefined;
    (runCardScan as jest.Mock)
      .mockImplementationOnce(() => new Promise<ScanResult>((resolve) => (finishFirst = resolve)))
      .mockResolvedValueOnce(result(NOW + 15 * MINUTE));
    native.armCards.mockImplementation((dueAt: number) => {
      order.push(`arm ${dueAt}`);
      return 'alarmClock';
    });

    const first = scanAndRearm('main', NOW);
    const second = scanAndRearm('stageChange');
    await Promise.resolve();
    expect(runCardScan).toHaveBeenCalledTimes(1);

    finishFirst(result(NOW + 30 * MINUTE, 1));
    await Promise.all([first, second]);

    expect(order).toEqual([`arm ${NOW + 30 * MINUTE}`, `arm ${NOW + 15 * MINUTE}`]);
  });
});
