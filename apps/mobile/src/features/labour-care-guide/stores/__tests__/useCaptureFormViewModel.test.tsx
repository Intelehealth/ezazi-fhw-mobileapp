import '@/core/i18n';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { getCardLayout } from '@ezazi/clinical-rules';

import { readWriterIdentity } from '@/core/session/writerIdentity';

import { saveCard } from '../../data/labourRepository';
import { useCaptureFormViewModel } from '../useCaptureFormViewModel';

jest.mock('@/core/db', () => ({ getDb: jest.fn(() => 'db-handle') }));
jest.mock('@/core/session/writerIdentity', () => ({ readWriterIdentity: jest.fn() }));
jest.mock('../../data/labourRepository', () => ({ saveCard: jest.fn() }));
jest.mock('@/core/utils/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

const WRITER = { providerUuid: 'provider-1', creatorUuid: 'creator-1' };
const LAYOUT = getCardLayout('Stage1_Hour1_2')!; // Baby, Labour progress, Medication, Shared decision

const setup = () => {
  const onSaved = jest.fn();
  const view = renderHook(() => useCaptureFormViewModel({ visitUuid: 'visit-1', encounterUuid: 'card-1', layout: LAYOUT, onSaved }));
  return { onSaved, ...view };
};

describe('useCaptureFormViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (readWriterIdentity as jest.Mock).mockResolvedValue(WRITER);
  });

  it('opens on the first of the card\'s tabs', () => {
    const { result } = setup();
    expect(result.current.tabs.map((tab) => tab.id)).toEqual(['baby', 'labourProgress', 'medication', 'sharedDecisionMaking']);
    expect(result.current.tabIndex).toBe(0);
    expect(result.current.isFirstTab).toBe(true);
  });

  it('moves with Next and Back, never past either end', () => {
    const { result } = setup();
    act(() => result.current.goBack());
    expect(result.current.tabIndex).toBe(0);
    act(() => result.current.goNext());
    act(() => result.current.goNext());
    expect(result.current.tabIndex).toBe(2);
    act(() => result.current.goBack());
    expect(result.current.tabIndex).toBe(1);
  });

  it('saves on the last Next as the logged-in writer, then reports it', async () => {
    const { result, onSaved } = setup();
    act(() => result.current.setTabIndex(3));
    act(() => result.current.form.setValue('baselineFhr', '140'));
    act(() => result.current.goNext());

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(saveCard).toHaveBeenCalledWith(
      expect.objectContaining({ visitUuid: 'visit-1', encounterUuid: 'card-1', writer: WRITER, card: expect.objectContaining({ values: expect.objectContaining({ baselineFhr: '140' }) }) }),
      'db-handle',
    );
  });

  it('jumps to the first tab in error instead of saving', async () => {
    const { result } = setup();
    act(() => result.current.form.setInfusionAnswer('oxytocin', 'yes'));
    act(() => result.current.setTabIndex(3));
    act(() => result.current.goNext());

    await waitFor(() => expect(result.current.tabIndex).toBe(2));
    expect(saveCard).not.toHaveBeenCalled();
    expect(result.current.tabErrorCounts).toEqual({ medication: 1 });
  });

  it('does not save without a logged-in writer', async () => {
    (readWriterIdentity as jest.Mock).mockResolvedValue(null);
    const { result, onSaved } = setup();
    act(() => result.current.setTabIndex(3));
    act(() => result.current.goNext());

    await waitFor(() => expect(result.current.saveState).toBe('failed'));
    expect(saveCard).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
