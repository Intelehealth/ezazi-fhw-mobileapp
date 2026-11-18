import '@/core/i18n';
import { act, renderHook } from '@testing-library/react-native';
import { STAGE1_OUTCOME, STAGE2_OUTCOME } from '@ezazi/clinical-rules';

import { onTablesChanged } from '@/core/db';
import { scanAndRearm } from '@/core/services/monitor/cardScheduler';
import { useAuthStore } from '@/core/session/auth.store';
import { useDbBootstrapStore } from '@/core/session/dbBootstrap.store';
import { readWriterIdentity } from '@/core/session/writerIdentity';

import { captureSos, endStage1, endStage2 } from '../../data/labourRepository';
import { readTimeline, type TimelineSnapshot } from '../../data/timelineReader';
import { useTimelineViewModel } from '../useTimelineViewModel';

jest.mock('@/core/db', () => ({ getDb: jest.fn(() => 'db-handle'), onTablesChanged: jest.fn() }));
jest.mock('@/core/session/writerIdentity', () => ({ readWriterIdentity: jest.fn() }));
jest.mock('@/core/services/monitor/cardScheduler', () => ({ scanAndRearm: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../data/timelineReader', () => ({ readTimeline: jest.fn() }));
jest.mock('../../data/labourRepository', () => ({ captureSos: jest.fn(), endStage1: jest.fn(), endStage2: jest.fn() }));
jest.mock('@/core/utils/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

const VISIT = 'visit-1';
const NOW = new Date('2026-10-26T10:00:00.000Z');
const WRITER = { providerUuid: 'provider-1', creatorUuid: 'user-1' };

const snapshot = (minutesAgo: number): TimelineSnapshot => ({
  cards: [
    {
      encounterUuid: 'card-1',
      cardName: 'Stage1_Hour1_1',
      isSos: false,
      encounterTime: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString().slice(0, 19).replace('T', ' '),
      hasRealObs: false,
      hasMissedMarker: false,
      recordedAt: null,
    },
  ],
  visit: { decisionPending: false, visitComplete: false, isVisitHolder: true },
  currentCardName: 'Stage1_Hour1_1',
  outcome: null,
});

let tablesChanged: () => void;

describe('useTimelineViewModel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.clearAllMocks();
    useAuthStore.setState({ userUuid: WRITER.providerUuid });
    useDbBootstrapStore.setState({ phase: 'ready' });
    (onTablesChanged as jest.Mock).mockImplementation((_tables: unknown, listener: () => void) => {
      tablesChanged = listener;
      return jest.fn();
    });
    (readTimeline as jest.Mock).mockReturnValue(snapshot(10));
  });

  afterEach(() => jest.useRealTimers());

  it('is null until the database is ready, then reads the visit once', () => {
    useDbBootstrapStore.setState({ phase: 'preparing' });
    const { result, rerender } = renderHook(() => useTimelineViewModel(VISIT));
    expect(result.current).toBeNull();
    expect(readTimeline).not.toHaveBeenCalled();

    act(() => useDbBootstrapStore.setState({ phase: 'ready' }));
    rerender({});

    expect(readTimeline).toHaveBeenCalledWith(VISIT, WRITER.providerUuid, 'db-handle');
    expect(result.current?.checkpoints.map((c) => c.status)).toEqual(['dueNow', 'upcoming']);
    expect(result.current?.activeStage).toBe('stage1');
  });

  it('re-reads when a watched table changes', () => {
    const { result } = renderHook(() => useTimelineViewModel(VISIT));
    (readTimeline as jest.Mock).mockReturnValue({ ...snapshot(10), currentCardName: 'Stage2_Hour1_1' });

    act(() => tablesChanged());

    expect(readTimeline).toHaveBeenCalledTimes(2);
    expect(result.current?.activeStage).toBe('stage2');
  });

  it('re-derives the cards each minute: the projected card disappears once it is due', () => {
    const { result } = renderHook(() => useTimelineViewModel(VISIT));
    expect(result.current?.checkpoints.at(-1)?.status).toBe('upcoming');

    act(() => {
      jest.advanceTimersByTime(20 * 60_000);
    });

    expect(result.current?.checkpoints.map((c) => c.status)).toEqual(['dueNow']);
  });

  it('captures an SOS as the logged-in writer', async () => {
    (readWriterIdentity as jest.Mock).mockResolvedValue(WRITER);
    (captureSos as jest.Mock).mockReturnValue({ kind: 'created', encounterUuid: 'sos-1' });
    const { result } = renderHook(() => useTimelineViewModel(VISIT));

    await expect(result.current!.captureSos()).resolves.toEqual({ kind: 'created', encounterUuid: 'sos-1' });
    expect(captureSos).toHaveBeenCalledWith(VISIT, WRITER, NOW.getTime(), 'db-handle');
  });

  it('returns the block reason, and writes nothing without a writer or when storage fails', async () => {
    (readWriterIdentity as jest.Mock).mockResolvedValue(WRITER);
    (captureSos as jest.Mock).mockReturnValue({ kind: 'blocked', reason: 'decisionPending' });
    const { result } = renderHook(() => useTimelineViewModel(VISIT));
    await expect(result.current!.captureSos()).resolves.toEqual({ kind: 'blocked', reason: 'decisionPending' });

    (captureSos as jest.Mock).mockClear();
    (readWriterIdentity as jest.Mock).mockResolvedValue(null);
    await expect(result.current!.captureSos()).resolves.toBeNull();
    (readWriterIdentity as jest.Mock).mockRejectedValue(new Error('keystore'));
    await expect(result.current!.captureSos()).resolves.toBeNull();
    expect(captureSos).not.toHaveBeenCalled();
  });

  it('starts Stage 2 as Android\'s "Move to Stage 2" choice, as the logged-in writer', async () => {
    (readWriterIdentity as jest.Mock).mockResolvedValue(WRITER);
    (endStage1 as jest.Mock).mockReturnValue({ kind: 'startStage2' });
    const { result } = renderHook(() => useTimelineViewModel(VISIT));

    await expect(result.current!.startStage2()).resolves.toBe(true);
    expect(endStage1).toHaveBeenCalledWith(VISIT, STAGE1_OUTCOME.MOVE_TO_STAGE2, {}, WRITER, NOW.getTime(), 'db-handle');
    // The first Stage 2 card's successor is 15 min away, sooner than the armed Stage 1 alarm.
    expect(scanAndRearm).toHaveBeenCalledWith('stageChange');
  });

  it('does not start Stage 2 twice, nor without a writer, nor when storage fails', async () => {
    (readWriterIdentity as jest.Mock).mockResolvedValue(WRITER);
    (readTimeline as jest.Mock).mockReturnValue({ ...snapshot(10), currentCardName: 'Stage2_Hour1_1' });
    const { result } = renderHook(() => useTimelineViewModel(VISIT));
    await expect(result.current!.startStage2()).resolves.toBe(false);

    (readTimeline as jest.Mock).mockReturnValue(snapshot(10));
    (readWriterIdentity as jest.Mock).mockResolvedValue(null);
    await expect(result.current!.startStage2()).resolves.toBe(false);
    (readWriterIdentity as jest.Mock).mockRejectedValue(new Error('keystore'));
    await expect(result.current!.startStage2()).resolves.toBe(false);
    expect(endStage1).not.toHaveBeenCalled();
    expect(scanAndRearm).not.toHaveBeenCalled();
  });

  it('completes a Stage 1 visit with the chosen outcome and re-arms the card alarm', async () => {
    (readWriterIdentity as jest.Mock).mockResolvedValue(WRITER);
    (endStage1 as jest.Mock).mockReturnValue({ kind: 'completeVisit', visitCompleteTime: 't', obs: [] });
    const { result } = renderHook(() => useTimelineViewModel(VISIT));

    await expect(result.current!.endStage1(STAGE1_OUTCOME.REFER_TO_ICU, {})).resolves.toMatchObject({ kind: 'completeVisit' });
    expect(endStage1).toHaveBeenCalledWith(VISIT, STAGE1_OUTCOME.REFER_TO_ICU, {}, WRITER, NOW.getTime(), 'db-handle');
    expect(scanAndRearm).toHaveBeenCalledWith('stageChange');
  });

  it('writes nothing for a nurse who does not hold the visit, on a completed visit, or in another stage (audit H1)', async () => {
    (readWriterIdentity as jest.Mock).mockResolvedValue(WRITER);
    const { result } = renderHook(() => useTimelineViewModel(VISIT));

    (readTimeline as jest.Mock).mockReturnValue({ ...snapshot(10), visit: { ...snapshot(10).visit, isVisitHolder: false } });
    await expect(result.current!.endStage1(STAGE1_OUTCOME.REFER_TO_ICU, {})).resolves.toBeNull();
    (readTimeline as jest.Mock).mockReturnValue({ ...snapshot(10), visit: { ...snapshot(10).visit, visitComplete: true } });
    await expect(result.current!.startStage2()).resolves.toBe(false);
    (readTimeline as jest.Mock).mockReturnValue(snapshot(10)); // Stage 1: End Stage 2 does nothing
    await expect(result.current!.endStage2(STAGE2_OUTCOME.OTHER, { otherComment: 'x' })).resolves.toBeNull();
    (readTimeline as jest.Mock).mockReturnValue({ ...snapshot(10), currentCardName: null }); // no stage card
    await expect(result.current!.endStage1(STAGE1_OUTCOME.REFER_TO_ICU, {})).resolves.toBeNull();

    expect(endStage1).not.toHaveBeenCalled();
    expect(endStage2).not.toHaveBeenCalled();
    expect(scanAndRearm).not.toHaveBeenCalled();
  });

  it('End Stage 2 runs only in Stage 2; Stage-3 opens the delivery form without re-arming', async () => {
    (readWriterIdentity as jest.Mock).mockResolvedValue(WRITER);
    (readTimeline as jest.Mock).mockReturnValue({ ...snapshot(10), currentCardName: 'Stage2_Hour1_1' });
    (endStage2 as jest.Mock).mockReturnValue({ kind: 'openDeliveryForm' });
    const { result } = renderHook(() => useTimelineViewModel(VISIT));

    expect(result.current?.endStage).toBe('stage2');
    await expect(result.current!.endStage2(STAGE2_OUTCOME.STAGE3_EARLY_POSTPARTUM, {})).resolves.toEqual({ kind: 'openDeliveryForm' });
    expect(scanAndRearm).not.toHaveBeenCalled();
  });

  it('keeps the last good timeline when a read fails', () => {
    const { result } = renderHook(() => useTimelineViewModel(VISIT));
    (readTimeline as jest.Mock).mockImplementation(() => {
      throw new Error('db closed');
    });

    act(() => tablesChanged());

    expect(result.current?.checkpoints.map((c) => c.status)).toEqual(['dueNow', 'upcoming']);
  });
});
