import '@/core/i18n';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { colors } from '@/core/config/theme';
import { RegistrationStepper } from '../RegistrationStepper';

function circleStyle(step: 'personal' | 'address'): ViewStyle {
  const style = screen.getByTestId(`step-circle-${step}`).props.style as StyleProp<ViewStyle>;
  return StyleSheet.flatten(style) ?? {};
}

describe('RegistrationStepper', () => {
  it('names both steps whichever one is current', () => {
    render(<RegistrationStepper currentStep="personal" />);

    expect(screen.getByText('Personal')).toBeTruthy();
    expect(screen.getByText('Address')).toBeTruthy();
  });

  // Nothing is complete on step 1, so neither circle is filled — the current
  // step and the upcoming one are both bordered.
  it('fills neither circle while the first step is current', () => {
    render(<RegistrationStepper currentStep="personal" />);

    expect(circleStyle('personal').backgroundColor).toBe(colors.stepperGreenTint);
    expect(circleStyle('personal').borderWidth).toBe(2);
    expect(circleStyle('address').backgroundColor).toBe(colors.stepperGreenTint);
    expect(circleStyle('address').borderWidth).toBe(2);
  });

  // Done is filled with no border; not-done keeps the tint and the border.
  // Read off frame 1:23211 and settled by Arpan 2026-11-24.
  it('fills the first circle and drops its border once the second step is current', () => {
    render(<RegistrationStepper currentStep="address" />);

    expect(circleStyle('personal').backgroundColor).toBe(colors.stepperGreen);
    expect(circleStyle('personal').borderWidth).toBeUndefined();
    expect(circleStyle('address').backgroundColor).toBe(colors.stepperGreenTint);
    expect(circleStyle('address').borderWidth).toBe(2);
  });
});
