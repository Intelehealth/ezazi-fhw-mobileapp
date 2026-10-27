import '@/core/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

import { useTimelineViewModel } from '../../stores/useTimelineViewModel';
import { TimelineScreen } from '../TimelineScreen';

jest.mock('../../stores/useTimelineViewModel', () => ({ useTimelineViewModel: jest.fn() }));

const captureSos = jest.fn();
const navigate = jest.fn();
const props = {
  navigation: { navigate },
  route: { key: 'Timeline-1', name: 'Timeline', params: { visitUuid: 'visit-1' } },
} as unknown as NativeStackScreenProps<RootStackParamList, 'Timeline'>;

const viewModel = {
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
    expect(screen.queryByText('STAGE 1')).toBeNull();
  });

  it('shows the stage heading; the patient app bar is the navigator\'s, not the screen\'s', () => {
    render(<TimelineScreen {...props} />);

    expect(screen.getByText('STAGE 1')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Close timeline' })).toBeNull();
  });

  it('opens the due card for capture from Record Now', () => {
    (useTimelineViewModel as jest.Mock).mockReturnValue({
      ...viewModel,
      checkpoints: [
        { id: 'c1', encounterUuid: 'card-1', scheduledAt: new Date().toISOString(), status: 'dueNow', access: 'write' },
      ],
    });
    render(<TimelineScreen {...props} />);

    fireEvent.press(screen.getByRole('button', { name: 'Record Now' }));

    expect(navigate).toHaveBeenCalledWith('CardCapture', { visitUuid: 'visit-1', encounterUuid: 'card-1' });
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
});
