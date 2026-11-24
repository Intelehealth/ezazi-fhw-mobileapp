import '@/core/i18n';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AppButton } from '@/core/ui/AppButton';
import { PatientRegistrationButton } from '../PatientRegistrationButton';

const onPress = jest.fn();

function heightOf(style: StyleProp<ViewStyle>): number | undefined {
  return StyleSheet.flatten(style)?.height as number | undefined;
}

describe('PatientRegistrationButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders its label and calls onPress when tapped', () => {
    render(<PatientRegistrationButton label="Continue" onPress={onPress} />);

    expect(screen.getByText('Continue')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reports itself disabled and ignores a press while a save is in flight', () => {
    render(<PatientRegistrationButton label="Register Patient" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Register Patient' });
    fireEvent.press(button);

    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(onPress).not.toHaveBeenCalled();
  });

  // Settled 2026-11-24, reversing an earlier "keep scale(60)": the address
  // footer puts an AppButton (Back) beside this one, and a scaled height made
  // them disagree by 4-20dp depending on tablet width. Do not re-scale this.
  it('stands exactly as tall as the AppButton it sits beside', () => {
    render(
      <>
        <AppButton label="Back" variant="outline" onPress={() => {}} />
        <PatientRegistrationButton label="Register Patient" onPress={onPress} />
      </>,
    );

    const back = heightOf(screen.getByRole('button', { name: 'Back' }).props.style);
    const submit = heightOf(screen.UNSAFE_getByType(LinearGradient).props.style);

    expect(back).toBeGreaterThan(0);
    expect(submit).toBe(back);
  });
});
