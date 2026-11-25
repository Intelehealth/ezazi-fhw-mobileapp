import '@/core/i18n';
import type { NativeStackHeaderProps, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { usePatientHeaderViewModel } from '@/features/labour-care-guide/stores/usePatientHeaderViewModel';

import { patientAppBar, patientCaptureAppBar } from '../screenOptions';

jest.mock('@/features/labour-care-guide/stores/usePatientHeaderViewModel', () => ({
  usePatientHeaderViewModel: jest.fn(),
}));

const PATIENT = { id: 'p1', name: 'Live Test Patient', ezId: 'EZ-DEV-0002', ageYears: 29, gravidaLabel: 'G-' };

const renderPreset = (preset: NativeStackNavigationOptions) => {
  const goBack = jest.fn();
  const props = {
    navigation: { goBack },
    route: { key: 'r1', name: 'CardCapture', params: { visitUuid: 'visit-1', encounterUuid: 'card-1' } },
  } as unknown as NativeStackHeaderProps;
  render(<>{preset.header?.(props)}</>);
  return goBack;
};

/** The labour presets mount the patient app bar for the route's visit (MOBILE_STACK §3.1). */
describe('patient app bar presets', () => {
  beforeEach(() => (usePatientHeaderViewModel as jest.Mock).mockReturnValue(PATIENT));

  it('shows the route visit\'s patient, with close on the Timeline preset', () => {
    const goBack = renderPreset(patientAppBar);

    expect(usePatientHeaderViewModel).toHaveBeenCalledWith('visit-1');
    expect(screen.getByText('Live Test Patient')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Close timeline' }));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('puts back first on the capture preset', () => {
    const goBack = renderPreset(patientCaptureAppBar);

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
