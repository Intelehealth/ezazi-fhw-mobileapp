import '@/core/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AlertSummary } from '../AlertSummary';

const SECTIONS = [
  {
    labelKey: 'partogram.section.baby',
    androidLabel: 'Baby',
    items: [{ labelKey: 'partogram.field.caput', androidLabel: 'Caput', value: '+++ (Marked)' }],
  },
  { labelKey: 'partogram.section.woman', androidLabel: 'Woman', items: [] },
];

describe('AlertSummary', () => {
  it('shows the alerted values under their tab, and skips tabs with none', () => {
    render(<AlertSummary sections={SECTIONS} />);
    expect(screen.getByText('OBSERVATION SUMMARY')).toBeTruthy();
    expect(screen.getByText('Baby')).toBeTruthy();
    expect(screen.getByText('CAPUT')).toBeTruthy();
    expect(screen.getByText('+++ (Marked)')).toBeTruthy();
    expect(screen.queryByText('Woman')).toBeNull();
  });

  it('collapses on tap', () => {
    render(<AlertSummary sections={SECTIONS} />);
    fireEvent.press(screen.getByRole('button'));
    expect(screen.queryByText('CAPUT')).toBeNull();
  });

  it('is hidden when nothing is alerted', () => {
    render(<AlertSummary sections={[SECTIONS[1]]} />);
    expect(screen.queryByText('OBSERVATION SUMMARY')).toBeNull();
  });
});
