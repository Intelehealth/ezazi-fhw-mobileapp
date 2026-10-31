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

const STORED = [
  { uuid: 'o1', fieldId: 'baselineFhr' as const, value: '150', createdAt: '2026-10-29 08:00:00' },
  { uuid: 'o2', fieldId: 'oxytocin' as const, value: 'No', createdAt: '2026-10-29 08:00:00' },
];

const setup = (access: 'write' | 'edit' | 'read' = 'write', stored: typeof STORED = []) => {
  const onSaved = jest.fn();
  const onExit = jest.fn();
  const view = renderHook(() =>
    useCaptureFormViewModel({ visitUuid: 'visit-1', encounterUuid: 'card-1', layout: LAYOUT, access, stored, onSaved, onExit }),
  );
  return { onSaved, onExit, ...view };
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

  it('saves no Medication "No"s when the Medication tab was never shown, as Android', async () => {
    const { result, onSaved } = setup();
    act(() => result.current.setTabIndex(3));
    act(() => result.current.goNext());

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const card = (saveCard as jest.Mock).mock.calls[0][0].card;
    expect(card.oxytocin.answer).toBeNull();
    expect(card.medicine.answer).toBeNull();
  });

  it('sets the Medication answers to "No" once that tab is shown', () => {
    const { result } = setup();
    act(() => result.current.setTabIndex(2));
    expect(result.current.form.medicine.answer).toBe('no');
    expect(result.current.form.infusionAnswer('ivFluids').answer).toBe('no');
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

  it('opens a submitted card with its saved values', () => {
    const { result } = setup('edit', STORED);
    expect(result.current.readOnly).toBe(false);
    expect(result.current.form.fieldValue('baselineFhr')).toBe('150');
    expect(result.current.form.infusionAnswer('oxytocin').answer).toBe('no');
  });

  it('leaves a read-only card on the last Next without saving', async () => {
    const { result, onExit, onSaved } = setup('read', STORED);
    expect(result.current.readOnly).toBe(true);
    act(() => result.current.setTabIndex(3));
    act(() => result.current.goNext());

    expect(onExit).toHaveBeenCalled();
    expect(saveCard).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('does not turn a read-only card\'s missing Medication answers into "No"', () => {
    const { result } = setup('read', []);
    act(() => result.current.setTabIndex(2));
    expect(result.current.form.medicine.answer).toBeNull();
  });
});
