import '@/core/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { logger } from '@/core/utils/logger';

import { usePatientHeaderViewModel } from '../../stores/usePatientHeaderViewModel';
import { PatientAppBar } from '../PatientAppBar';

jest.mock('../../stores/usePatientHeaderViewModel', () => ({ usePatientHeaderViewModel: jest.fn() }));

jest.mock('@/core/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const PATIENT = { id: 'p1', name: 'Live Test Patient', ezId: 'EZ-DEV-0002', ageYears: 29, gravidaLabel: 'G-' };

/** The navigator-mounted labour app bar: the visit's patient in PatientHeader, LCG / Postpartum not built yet. */
describe('PatientAppBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePatientHeaderViewModel as jest.Mock).mockReturnValue(PATIENT);
  });

  it('reads the patient of the visit it is mounted for', () => {
    render(<PatientAppBar visitUuid="visit-1" navigation="close" onNavigate={jest.fn()} />);

    expect(usePatientHeaderViewModel).toHaveBeenCalledWith('visit-1');
    expect(screen.getByText('Live Test Patient')).toBeTruthy();
    expect(screen.getByText('EZ-DEV-0002 · 29 years · G-')).toBeTruthy();
  });

  it('keeps the bar, without a patient line, while the patient is read', () => {
    (usePatientHeaderViewModel as jest.Mock).mockReturnValue(null);
    render(<PatientAppBar visitUuid="visit-1" navigation="back" onNavigate={jest.fn()} />);

    expect(screen.queryByText('Live Test Patient')).toBeNull();
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
  });

  it('closes from the Timeline variant and goes back from the capture variant', () => {
    const onClose = jest.fn();
    const { rerender } = render(<PatientAppBar visitUuid="visit-1" navigation="close" onNavigate={onClose} />);
    fireEvent.press(screen.getByRole('button', { name: 'Close timeline' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    const onBack = jest.fn();
    rerender(<PatientAppBar visitUuid="visit-1" navigation="back" onNavigate={onBack} />);
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('only logs View LCG and Postpartum Report, whose screens are not built yet', () => {
    const onNavigate = jest.fn();
    render(<PatientAppBar visitUuid="visit-1" navigation="close" onNavigate={onNavigate} />);

    fireEvent.press(screen.getByRole('button', { name: 'View Labour Care Guide' }));
    fireEvent.press(screen.getByRole('button', { name: 'View Postpartum Report' }));

    expect(logger.debug).toHaveBeenCalledWith('[patientAppBar] View LCG tapped');
    expect(logger.debug).toHaveBeenCalledWith('[patientAppBar] Postpartum Report tapped');
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
