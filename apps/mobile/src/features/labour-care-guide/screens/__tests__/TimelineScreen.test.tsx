import '@/core/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

import { useTimelineViewModel } from '../../stores/useTimelineViewModel';
import { TimelineScreen } from '../TimelineScreen';

jest.mock('../../stores/useTimelineViewModel', () => ({ useTimelineViewModel: jest.fn() }));

const captureSos = jest.fn();
const goBack = jest.fn();
const props = {
  navigation: { goBack },
  route: { key: 'Timeline-1', name: 'Timeline', params: { visitUuid: 'visit-1' } },
} as unknown as NativeStackScreenProps<RootStackParamList, 'Timeline'>;

const viewModel = {
  patient: { id: 'p1', name: 'Live Test Patient', ezId: 'EZ-DEV-0002', ageYears: 29, gravidaLabel: 'G-' },
  checkpoints: [],
  activeStage: 'stage1' as const,
  captureSos,
};

describe('TimelineScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTimelineViewModel as jest.Mock).mockReturnValue(viewModel);
  });

  it('reads the visit it was opened for, and stays blank until it has loaded', () => {
    (useTimelineViewModel as jest.Mock).mockReturnValue(null);
    render(<TimelineScreen {...props} />);

    expect(useTimelineViewModel).toHaveBeenCalledWith('visit-1');
    expect(screen.queryByText('Live Test Patient')).toBeNull();
  });

  it('shows the patient, the stage heading and the stage stepper', () => {
    render(<TimelineScreen {...props} />);

    expect(screen.getByText('Live Test Patient')).toBeTruthy();
    expect(screen.getByText('EZ-DEV-0002 · 29 years · G-')).toBeTruthy();
    expect(screen.getByText('STAGE 1')).toBeTruthy();
  });

  it('captures an SOS only after its confirm', () => {
    render(<TimelineScreen {...props} />);

    fireEvent.press(screen.getByRole('button', { name: 'Send SOS alert' }));
    expect(screen.getByText('Capture SOS observation?')).toBeTruthy();
    expect(captureSos).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Capture SOS' }));
    expect(captureSos).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Capture SOS observation?')).toBeNull();
  });

  it('writes nothing when the SOS confirm is cancelled', () => {
    render(<TimelineScreen {...props} />);

    fireEvent.press(screen.getByRole('button', { name: 'Send SOS alert' }));
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(captureSos).not.toHaveBeenCalled();
    expect(screen.queryByText('Capture SOS observation?')).toBeNull();
  });

  it('closes back to the previous screen', () => {
    render(<TimelineScreen {...props} />);

    fireEvent.press(screen.getByRole('button', { name: 'Close timeline' }));

    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
