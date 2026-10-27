import '@/core/i18n';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { colors } from '@/core/config/theme';

import { StepperInput } from '../StepperInput';

const BOUNDS = { min: 50, max: 200, base: 110, step: 1, fractionDigits: 0 };

const setup = (props: Partial<React.ComponentProps<typeof StepperInput>> = {}) => {
  const onChange = jest.fn();
  render(<StepperInput label="Baseline FHR" value="" onChange={onChange} bounds={BOUNDS} placeholder="Enter FHR" {...props} />);
  return onChange;
};

const inputStyle = () => StyleSheet.flatten(screen.getByLabelText('Baseline FHR').props.style);

describe('StepperInput', () => {
  it('fills the base on the first +', () => {
    const onChange = setup();
    fireEvent.press(screen.getByRole('button', { name: 'Increase Baseline FHR' }));
    expect(onChange).toHaveBeenLastCalledWith('110');
  });

  it('steps from the value', () => {
    const onChange = setup({ value: '120' });
    fireEvent.press(screen.getByRole('button', { name: 'Decrease Baseline FHR' }));
    expect(onChange).toHaveBeenLastCalledWith('119');
  });

  it('keeps typed text to digits within the maximum\'s length', () => {
    const onChange = setup();
    fireEvent.changeText(screen.getByLabelText('Baseline FHR'), '12a34');
    expect(onChange).toHaveBeenLastCalledWith('123');
  });

  it('disables + at the maximum', () => {
    setup({ value: '200' });
    expect(screen.getByRole('button', { name: 'Increase Baseline FHR' }).props.accessibilityState.disabled).toBe(true);
  });

  it('shows the placeholder while empty', () => {
    setup();
    expect(screen.getByPlaceholderText('Enter FHR')).toBeTruthy();
  });

  it('colours an alert value pink', () => {
    setup({ value: '180', alert: true });
    expect(inputStyle().borderColor).toBe(colors.controlAlertBorder);
  });

  it('outlines an error in red', () => {
    setup({ error: true });
    expect(inputStyle().borderColor).toBe(colors.alertFigma);
  });

  it('cannot be typed in or stepped when disabled', () => {
    setup({ disabled: true });
    expect(screen.getByLabelText('Baseline FHR').props.editable).toBe(false);
    expect(inputStyle().backgroundColor).toBe(colors.controlDisabledBg);
    expect(screen.getByRole('button', { name: 'Increase Baseline FHR' }).props.accessibilityState.disabled).toBe(true);
  });
});
