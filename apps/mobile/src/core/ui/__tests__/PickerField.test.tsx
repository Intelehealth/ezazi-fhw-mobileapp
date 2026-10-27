import '@/core/i18n';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { colors } from '@/core/config/theme';

import { PickerField } from '../PickerField';

const OPTIONS = [
  { value: 'C', label: 'Clear' },
  { value: 'M+++', label: 'Thick meconium', alert: true },
];

const setup = (props: Partial<React.ComponentProps<typeof PickerField>> = {}) => {
  const onChange = jest.fn();
  render(<PickerField label="Amniotic fluid" options={OPTIONS} value={null} onChange={onChange} placeholder="Select" {...props} />);
  return onChange;
};

const fieldStyle = () => StyleSheet.flatten(screen.getByRole('button', { name: 'Amniotic fluid' }).props.style);

describe('PickerField', () => {
  it('shows the placeholder until something is picked', () => {
    setup();
    expect(screen.getByText('Select')).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Clear' })).toBeNull();
  });

  it('opens the sheet, reports the pick and closes', () => {
    const onChange = setup();
    fireEvent.press(screen.getByRole('button', { name: 'Amniotic fluid' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Thick meconium' }));

    expect(onChange).toHaveBeenCalledWith('M+++');
    expect(screen.queryByRole('radio', { name: 'Clear' })).toBeNull();
  });

  it('shows the picked label, pink for an alert value', () => {
    setup({ value: 'M+++' });
    expect(screen.getByText('Thick meconium')).toBeTruthy();
    expect(fieldStyle().borderColor).toBe(colors.controlAlertBorder);
  });

  it('outlines in red on error', () => {
    setup({ error: true });
    expect(fieldStyle().borderColor).toBe(colors.alertFigma);
  });

  it('does not open when disabled', () => {
    setup({ disabled: true });
    fireEvent.press(screen.getByRole('button', { name: 'Amniotic fluid' }));
    expect(screen.queryByRole('radio', { name: 'Clear' })).toBeNull();
  });
});
