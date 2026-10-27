import '@/core/i18n';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getCardLayout } from '@ezazi/clinical-rules';

import { readWriterIdentity } from '@/core/session/writerIdentity';
import { formatClockTime } from '@/core/utils/calendar';
import type { RootStackParamList } from '@/navigation/types';

import { useCardCaptureViewModel } from '../../stores/useCardCaptureViewModel';
import { CardCaptureScreen } from '../CardCaptureScreen';

jest.mock('../../stores/useCardCaptureViewModel', () => ({ useCardCaptureViewModel: jest.fn() }));
jest.mock('../../data/labourRepository', () => ({ saveCard: jest.fn() }));
jest.mock('@/core/db', () => ({ getDb: jest.fn(() => 'db-handle') }));
jest.mock('@/core/session/writerIdentity', () => ({ readWriterIdentity: jest.fn() }));
jest.mock('@/core/utils/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

// Read through the mock: a screen file may not import the data layer, its test included.
const { saveCard } = jest.requireMock<{ saveCard: jest.Mock }>('../../data/labourRepository');

const SCHEDULED_AT = '2026-10-27T04:00:00.000Z';
const HEADER = { isSos: false, stage: 'stage1', scheduledAt: SCHEDULED_AT };
const LAYOUT = getCardLayout('Stage1_Hour1_2')!; // Baby, Labour progress, Medication, Shared decision

type BeforeRemove = (event: { preventDefault: () => void; data: { action: unknown } }) => void;

const setup = () => {
  let beforeRemove: BeforeRemove = () => undefined;
  const navigation = {
    addListener: jest.fn((_name: string, listener: BeforeRemove) => {
      beforeRemove = listener;
      return jest.fn();
    }),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  };
  const props = {
    navigation,
    route: { key: 'CardCapture-1', name: 'CardCapture', params: { visitUuid: 'visit-1', encounterUuid: 'card-1' } },
  } as unknown as NativeStackScreenProps<RootStackParamList, 'CardCapture'>;
  render(<CardCaptureScreen {...props} />);
  const leave = () => {
    const event = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
    act(() => beforeRemove(event));
    return event;
  };
  return { navigation, leave };
};

describe('CardCaptureScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (readWriterIdentity as jest.Mock).mockResolvedValue({ providerUuid: 'provider-1', creatorUuid: 'creator-1' });
  });

  it('reads the card it was opened for, and stays blank until it has loaded', () => {
    (useCardCaptureViewModel as jest.Mock).mockReturnValue(null);
    setup();

    expect(useCardCaptureViewModel).toHaveBeenCalledWith('card-1');
    expect(screen.queryByText(/OBSERVATION/)).toBeNull();
  });

  it('titles a timer card as scheduled, with its stage and time (Figma 251:581)', () => {
    (useCardCaptureViewModel as jest.Mock).mockReturnValue({ header: HEADER, layout: null });
    setup();

    expect(screen.getByText('SCHEDULED OBSERVATION · STAGE 1')).toBeTruthy();
    expect(screen.getByText(`Observation ${formatClockTime(SCHEDULED_AT)}`)).toBeTruthy();
  });

  it('gives an SOS card no title: it is never scheduled', () => {
    (useCardCaptureViewModel as jest.Mock).mockReturnValue({ header: { ...HEADER, isSos: true }, layout: null });
    setup();

    expect(screen.queryByText(/OBSERVATION/)).toBeNull();
  });

  it('shows the card\'s tabs, with Back only from the second tab', () => {
    (useCardCaptureViewModel as jest.Mock).mockReturnValue({ header: HEADER, layout: LAYOUT });
    setup();

    expect(screen.getAllByRole('tab').map((tab) => tab.props.accessibilityLabel)).toEqual([
      'Baby',
      'Labour progress',
      'Medication',
      'Shared decision',
    ]);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('tab', { name: 'Labour progress' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
  });

  it('saves on the last Next and goes back to the Timeline', async () => {
    (useCardCaptureViewModel as jest.Mock).mockReturnValue({ header: HEADER, layout: LAYOUT });
    const { navigation } = setup();

    fireEvent.press(screen.getByRole('tab', { name: 'Shared decision' }));
    fireEvent.press(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(saveCard).toHaveBeenCalledWith(expect.objectContaining({ encounterUuid: 'card-1' }), 'db-handle');
  });

  it('asks before leaving; Continue keeps the form open', () => {
    (useCardCaptureViewModel as jest.Mock).mockReturnValue({ header: HEADER, layout: LAYOUT });
    const { leave } = setup();

    const event = leave();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(screen.getByText('Are you sure you want to close patient observation?')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByText('Are you sure you want to close patient observation?')).toBeNull();
    expect(saveCard).not.toHaveBeenCalled();
  });

  it('Save & Exit saves the card, then finishes leaving', async () => {
    (useCardCaptureViewModel as jest.Mock).mockReturnValue({ header: HEADER, layout: LAYOUT });
    const { leave, navigation } = setup();

    leave();
    fireEvent.press(screen.getByRole('button', { name: 'Save & Exit' }));

    await waitFor(() => expect(navigation.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' }));
    expect(saveCard).toHaveBeenCalled();
  });
});
