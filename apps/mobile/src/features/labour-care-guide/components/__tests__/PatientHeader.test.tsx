import '@/core/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PatientHeader, type HeaderNavigation } from '../PatientHeader';

const PATIENT = { id: 'p1', name: 'Live Test Patient', ezId: 'EZ-DEV-0002', ageYears: 29, gravidaLabel: 'G-' };

const renderHeader = (navigation: HeaderNavigation, patient: typeof PATIENT | null = PATIENT) => {
  const handlers = { onNavigate: jest.fn(), onViewLcg: jest.fn(), onViewPostpartumReport: jest.fn() };
  render(<PatientHeader patient={patient} navigation={navigation} {...handlers} />);
  return handlers;
};

/** One header for the labour screens: close on the Timeline, back on capture (Figma 251:365 / 251:559). */
describe('PatientHeader', () => {
  it('shows the patient line', () => {
    renderHeader('close');

    expect(screen.getByText('Live Test Patient')).toBeTruthy();
    expect(screen.getByText('EZ-DEV-0002 · 29 years · G-')).toBeTruthy();
  });

  it('closes from the Timeline variant, which has no back button', () => {
    const { onNavigate } = renderHeader('close');

    fireEvent.press(screen.getByRole('button', { name: 'Close timeline' }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('goes back from the capture variant, which has no close button', () => {
    const { onNavigate } = renderHeader('back');

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Close timeline' })).toBeNull();
  });

  it('keeps its buttons while the patient is still being read', () => {
    const { onViewLcg } = renderHeader('back', null);

    expect(screen.queryByText('Live Test Patient')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'View Labour Care Guide' }));
    expect(onViewLcg).toHaveBeenCalledTimes(1);
  });
});
