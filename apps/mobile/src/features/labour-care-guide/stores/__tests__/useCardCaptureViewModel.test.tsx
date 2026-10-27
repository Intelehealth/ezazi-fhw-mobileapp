import { act, renderHook } from '@testing-library/react-native';

import { useDbBootstrapStore } from '@/core/session/dbBootstrap.store';

import { readCaptureCard } from '../../data/captureReader';
import { useCardCaptureViewModel } from '../useCardCaptureViewModel';

jest.mock('@/core/db', () => ({ getDb: jest.fn(() => 'db-handle') }));
jest.mock('../../data/captureReader', () => ({ readCaptureCard: jest.fn() }));
jest.mock('@/core/utils/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

const ROW = {
  encounterUuid: 'card-1',
  cardName: 'Stage1_Hour2_1',
  isSos: false,
  sosLabel: null,
  encounterTime: '2026-10-27 04:00:00',
};

describe('useCardCaptureViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDbBootstrapStore.setState({ phase: 'ready' });
    (readCaptureCard as jest.Mock).mockReturnValue(ROW);
  });

  it('is null until the database is ready, then reads the card it opens', () => {
    useDbBootstrapStore.setState({ phase: 'preparing' });
    const { result, rerender } = renderHook(() => useCardCaptureViewModel('card-1'));
    expect(result.current).toBeNull();

    act(() => useDbBootstrapStore.setState({ phase: 'ready' }));
    rerender({});

    expect(readCaptureCard).toHaveBeenCalledWith('card-1', 'db-handle');
    expect(result.current?.header).toEqual({ isSos: false, stage: 'stage1', scheduledAt: '2026-10-27T04:00:00.000Z' });
  });

  it('stays null for a card that cannot be read', () => {
    (readCaptureCard as jest.Mock).mockReturnValue(null);
    const { result } = renderHook(() => useCardCaptureViewModel('missing'));

    expect(result.current).toBeNull();
  });

  it('stays null when the read fails', () => {
    (readCaptureCard as jest.Mock).mockImplementation(() => {
      throw new Error('db closed');
    });
    const { result } = renderHook(() => useCardCaptureViewModel('card-1'));

    expect(result.current).toBeNull();
  });
});
