import '@/core/i18n';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

import { useTimelineViewModel } from '../../stores/useTimelineViewModel';
import { TimelineScreen } from '../TimelineScreen';

jest.mock('../../stores/useTimelineViewModel', () => ({ useTimelineViewModel: jest.fn() }));

const captureSos = jest.fn();
const startStage2 = jest.fn();
const endStage1 = jest.fn();
const endStage2 = jest.fn();
const navigate = jest.fn();
const popTo = jest.fn();
const props = {
  navigation: { navigate, popTo },
  route: { key: 'Timeline-1', name: 'Timeline', params: { visitUuid: 'visit-1' } },
} as unknown as NativeStackScreenProps<RootStackParamList, 'Timeline'>;

const viewModel = {
  checkpoints: [],
  activeStage: 'stage1' as const,
  captureSos,
  startStage2,
  endStage: 'stage1' as 'stage1' | 'stage2' | null,
  visitComplete: false,
  isVisitHolder: true,
  outcome: null as null | { outcome: string; hasMotherDeceased: boolean; motherDeceasedReason: string | null; otherComment: string | null },
  endStage1,
  endStage2,
};
const COMPLETED = { kind: 'completeVisit', visitCompleteTime: 't', obs: [] };

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

  it('opens scrolled to the due card, once (audit M6)', () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => undefined);
    const at = new Date().toISOString();
    (useTimelineViewModel as jest.Mock).mockReturnValue({
      ...viewModel,
      checkpoints: [
        { id: 'c1', encounterUuid: 'card-1', scheduledAt: at, status: 'completed', access: 'read' },
        { id: 'c2', encounterUuid: 'card-2', scheduledAt: at, status: 'dueNow', access: 'write' },
      ],
    });
    render(<TimelineScreen {...props} />);
    const layout = (y: number) => ({ nativeEvent: { layout: { x: 0, y, width: 400, height: 120 } } });

    fireEvent(screen.getByTestId('timeline-card-c1'), 'layout', layout(0));
    expect(scrollTo).not.toHaveBeenCalled();
    fireEvent(screen.getByTestId('timeline-card-c2'), 'layout', layout(900));
    expect(scrollTo).toHaveBeenCalledWith({ y: expect.any(Number), animated: false });
    expect((scrollTo.mock.calls[0][0] as { y: number }).y).toBeGreaterThan(800);

    fireEvent(screen.getByTestId('timeline-card-c2'), 'layout', layout(950));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    scrollTo.mockRestore();
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

    expect(navigate).toHaveBeenCalledWith('CardCapture', { visitUuid: 'visit-1', encounterUuid: 'card-1', access: 'write' });
  });

  it('captures an SOS only after its confirm', () => {
    render(<TimelineScreen {...props} />);

    fireEvent.press(screen.getByRole('button', { name: 'Send SOS alert' }));
    expect(screen.getByText('SOS Data Entry!')).toBeTruthy();
    expect(captureSos).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
    expect(captureSos).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('SOS Data Entry!')).toBeNull();
  });

  it('writes nothing when the SOS confirm is cancelled', () => {
    render(<TimelineScreen {...props} />);

    fireEvent.press(screen.getByRole('button', { name: 'Send SOS alert' }));
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(captureSos).not.toHaveBeenCalled();
    expect(screen.queryByText('SOS Data Entry!')).toBeNull();
  });

  it('End First Stage opens Android\'s six choices; Move to Stage 2 then asks, and starts Stage 2 on Yes', () => {
    render(<TimelineScreen {...props} />);

    fireEvent.press(screen.getByRole('button', { name: 'End First Stage' }));
    expect(screen.getByText('Select an option')).toBeTruthy();
    ['Move to Stage 2', 'Refer to other Hospital', 'Self discharge against Medical Advice', 'Shift to C-Section',
      'Refer to high dependency unit / ICU', 'Mother Death'].forEach((label) => expect(screen.getByText(label)).toBeTruthy());

    fireEvent.press(screen.getByRole('radio', { name: 'Move to Stage 2' }));
    fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
    return waitFor(() => expect(screen.getByText('Are you sure you want to End Stage 1?')).toBeTruthy()).then(() => {
      expect(startStage2).not.toHaveBeenCalled();
      fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
      expect(startStage2).toHaveBeenCalledTimes(1);
    });
  });

  it('Yes with nothing chosen keeps the list open with Android\'s message; Cancel writes nothing', async () => {
    render(<TimelineScreen {...props} />);

    fireEvent.press(screen.getByRole('button', { name: 'End First Stage' }));
    fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
    expect(await screen.findByText('Please select item')).toBeTruthy();
    expect(screen.getByText('Select an option')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Select an option')).toBeNull();
    expect(startStage2).not.toHaveBeenCalled();
    expect(endStage1).not.toHaveBeenCalled();
  });

  it('a referral asks Android\'s question, completes the visit and goes back to Home', async () => {
    endStage1.mockResolvedValue(COMPLETED);
    render(<TimelineScreen {...props} />);

    fireEvent.press(screen.getByRole('button', { name: 'End First Stage' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Refer to high dependency unit / ICU' }));
    fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
    expect(await screen.findByText('Are you sure patient wants to "Refer to high dependency unit / ICU"?')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
    await waitFor(() => expect(popTo).toHaveBeenCalledWith('Home'));
    expect(endStage1).toHaveBeenCalledWith('referToIcu', { otherComment: undefined });
  });

  it('Refer to other Hospital asks, then takes the Refer Section details', async () => {
    endStage1.mockResolvedValue(COMPLETED);
    render(<TimelineScreen {...props} />);

    fireEvent.press(screen.getByRole('button', { name: 'End First Stage' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Refer to other Hospital' }));
    fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
    expect(await screen.findByText('Are you sure you want to "Refer to other hospital"?')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
    expect(await screen.findByText('Refer Section')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Hospital Name'), 'district hospital');
    fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
    await waitFor(() => expect(endStage1).toHaveBeenCalledWith('referOtherHospital', {
      hospitalName: 'District hospital',
      doctorName: '',
      note: '',
    }));
  });

  it('Mother Death needs a reason before anything is written', async () => {
    endStage1.mockResolvedValue(COMPLETED);
    render(<TimelineScreen {...props} />);

    fireEvent.press(screen.getByRole('button', { name: 'End First Stage' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Mother Death' }));
    fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
    await screen.findByPlaceholderText('Enter Reason');

    fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
    expect(await screen.findByText('Please enter reason')).toBeTruthy();
    expect(endStage1).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByPlaceholderText('Enter Reason'), 'PPH');
    fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
    await waitFor(() => expect(endStage1).toHaveBeenCalledWith('motherDeath', { reason: 'PPH' }));
  });

  it('End Second Stage: "Other" asks with the comment, then completes the visit', async () => {
    endStage2.mockResolvedValue(COMPLETED);
    (useTimelineViewModel as jest.Mock).mockReturnValue({ ...viewModel, activeStage: 'stage2', endStage: 'stage2' });
    render(<TimelineScreen {...props} />);

    fireEvent.press(screen.getByRole('button', { name: 'End Second Stage' }));
    expect(screen.getByText('Additional Information')).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText('Enter Other Comment'), 'family took her home');
    fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
    expect(await screen.findByText('Are you sure you want to complete visit now with "Family took her home"?')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
    await waitFor(() => expect(endStage2).toHaveBeenCalledWith('other', { otherComment: 'Family took her home' }));
    expect(popTo).toHaveBeenCalledWith('Home');
  });

  it('End Second Stage: Stage-3 and Mother Death clear each other; Stage-3 says the delivery form comes later', async () => {
    (useTimelineViewModel as jest.Mock).mockReturnValue({ ...viewModel, activeStage: 'stage2', endStage: 'stage2' });
    render(<TimelineScreen {...props} />);

    fireEvent.press(screen.getByRole('button', { name: 'End Second Stage' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Stage-3 & Early Postpartum' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Mother Death' }));
    expect(screen.getByRole('radio', { name: 'Stage-3 & Early Postpartum' }).props.accessibilityState.selected).toBe(false);
    expect(screen.getByRole('radio', { name: 'Mother Death' }).props.accessibilityState.selected).toBe(true);

    fireEvent.press(screen.getByRole('radio', { name: 'Stage-3 & Early Postpartum' }));
    fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
    expect(await screen.findByText('The Women Delivery Details form is not available yet.')).toBeTruthy();
    expect(endStage2).not.toHaveBeenCalled();
  });

  it('End Stage is disabled for a nurse who does not hold the visit, and does nothing without a stage to end', () => {
    (useTimelineViewModel as jest.Mock).mockReturnValue({ ...viewModel, isVisitHolder: false });
    const { rerender } = render(<TimelineScreen {...props} />);
    expect(screen.getByRole('button', { name: 'End First Stage' }).props.accessibilityState.disabled).toBe(true);

    (useTimelineViewModel as jest.Mock).mockReturnValue({ ...viewModel, endStage: null });
    rerender(<TimelineScreen {...props} />);
    fireEvent.press(screen.getByRole('button', { name: 'End First Stage' }));
    expect(screen.queryByText('Select an option')).toBeNull();
  });

  it('a completed visit shows its outcome instead of End Stage and the quick actions (Android)', () => {
    (useTimelineViewModel as jest.Mock).mockReturnValue({
      ...viewModel,
      visitComplete: true,
      outcome: { outcome: 'Refer to high dependency unit / ICU', hasMotherDeceased: false, motherDeceasedReason: null, otherComment: null },
    });
    render(<TimelineScreen {...props} />);

    expect(screen.getByText('Mother Outcome: Refer to high dependency unit / ICU')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'End First Stage' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Send SOS alert' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'View more' })).toBeNull();
  });

  it('a Mother Death outcome shows its reason, and View more the full text', () => {
    (useTimelineViewModel as jest.Mock).mockReturnValue({
      ...viewModel,
      visitComplete: true,
      outcome: { outcome: 'Mother Death', hasMotherDeceased: true, motherDeceasedReason: 'PPH', otherComment: null },
    });
    render(<TimelineScreen {...props} />);

    expect(screen.getByText('Outcome: Mother Death')).toBeTruthy();
    expect(screen.getByText('Reason: PPH')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'View more' }));
    expect(screen.getByText('Mother Deceased Reason:\nPPH')).toBeTruthy();
  });
});
