import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { colors } from '@/core/config/theme';
import { AppButton } from '../AppButton';

const labelColor = (label: string) => StyleSheet.flatten(screen.getByText(label).props.style).color;

describe('AppButton', () => {
  it('presses through its handler', () => {
    const onPress = jest.fn();
    render(<AppButton label="Next" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Next' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('colours the label by variant, and by tone when disabled', () => {
    render(
      <>
        <AppButton label="Primary" onPress={jest.fn()} />
        <AppButton label="Outline" onPress={jest.fn()} variant="outline" />
        <AppButton label="Secondary" onPress={jest.fn()} variant="secondary" />
        <AppButton label="Disabled" onPress={jest.fn()} disabled />
        <AppButton label="Brand" onPress={jest.fn()} disabled disabledTone="brand" />
      </>,
    );

    expect(labelColor('Primary')).toBe(colors.onPrimary);
    expect(labelColor('Outline')).toBe(colors.primary);
    expect(labelColor('Secondary')).toBe(colors.buttonSecondaryTextFigma);
    expect(labelColor('Disabled')).toBe(colors.disabledText);
    expect(labelColor('Brand')).toBe(colors.onPrimary);
  });
});
