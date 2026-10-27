import '@/core/i18n';
import { act, renderHook } from '@testing-library/react-native';

import { onTablesChanged } from '@/core/db';
import { useAuthStore } from '@/core/session/auth.store';
import { useDbBootstrapStore } from '@/core/session/dbBootstrap.store';
import { readWriterIdentity } from '@/core/session/writerIdentity';

import { captureSos } from '../../data/labourRepository';
import { readTimeline, type TimelineSnapshot } from '../../data/timelineReader';
import { useTimelineViewModel } from '../useTimelineViewModel';

jest.mock('@/core/db', () => ({ getDb: jest.fn(() => 'db-handle'), onTablesChanged: jest.fn() }));
jest.mock('@/core/session/writerIdentity', () => ({ readWriterIdentity: jest.fn() }));
jest.mock('../../data/timelineReader', () => ({ readTimeline: jest.fn() }));
jest.mock('../../data/labourRepository', () => ({ captureSos: jest.fn() }));
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

  it('keeps the last good timeline when a read fails', () => {
    const { result } = renderHook(() => useTimelineViewModel(VISIT));
    (readTimeline as jest.Mock).mockImplementation(() => {
      throw new Error('db closed');
    });

    act(() => tablesChanged());

    expect(result.current?.checkpoints.map((c) => c.status)).toEqual(['dueNow', 'upcoming']);
  });
});
