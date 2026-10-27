import '@/core/i18n';
import { render, screen } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { formatClockTime } from '@/core/utils/calendar';

import { useCardCaptureViewModel } from '../../stores/useCardCaptureViewModel';
import { CardCaptureScreen } from '../CardCaptureScreen';

jest.mock('../../stores/useCardCaptureViewModel', () => ({ useCardCaptureViewModel: jest.fn() }));

const SCHEDULED_AT = '2026-10-27T04:00:00.000Z';
const props = {
  navigation: {},
  route: { key: 'CardCapture-1', name: 'CardCapture', params: { visitUuid: 'visit-1', encounterUuid: 'card-1' } },
} as unknown as NativeStackScreenProps<RootStackParamList, 'CardCapture'>;

describe('CardCaptureScreen', () => {
  it('reads the card it was opened for, and stays blank until it has loaded', () => {
    (useCardCaptureViewModel as jest.Mock).mockReturnValue(null);
    render(<CardCaptureScreen {...props} />);

    expect(useCardCaptureViewModel).toHaveBeenCalledWith('card-1');
    expect(screen.queryByText(/OBSERVATION/)).toBeNull();
  });

  it('titles a timer card as scheduled, with its stage and time (Figma 251:581)', () => {
    (useCardCaptureViewModel as jest.Mock).mockReturnValue({
      header: { isSos: false, stage: 'stage1', scheduledAt: SCHEDULED_AT },
    });
    render(<CardCaptureScreen {...props} />);

    expect(screen.getByText('SCHEDULED OBSERVATION · STAGE 1')).toBeTruthy();
    expect(screen.getByText(`Observation ${formatClockTime(SCHEDULED_AT)}`)).toBeTruthy();
  });

  it('gives an SOS card no title: it is never scheduled', () => {
    (useCardCaptureViewModel as jest.Mock).mockReturnValue({
      header: { isSos: true, stage: 'stage2', scheduledAt: SCHEDULED_AT },
    });
    render(<CardCaptureScreen {...props} />);

    expect(screen.queryByText(/OBSERVATION/)).toBeNull();
    expect(screen.queryByText(/^Observation /)).toBeNull();
  });
});
