import { Keyboard, StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { colors } from '@/core/config/theme';

import { ChoiceButton } from '../ChoiceButton';
import type { ControlState } from '../controlLook';

const setup = (state: ControlState = {}, style?: { flex: number }) => {
  const onPress = jest.fn();
  render(<ChoiceButton label="Yes" state={state} onPress={onPress} style={style} />);
  return onPress;
};

const button = () => screen.getByRole('radio', { name: 'Yes' });
const buttonStyle = () => StyleSheet.flatten(button().props.style);

/** One option of SegmentedChoice / NumberChips: a radio drawn in the look of its state. */
describe('ChoiceButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is a radio named by its label, and reports a press after closing the keyboard', () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    const onPress = setup();

    expect(screen.getByText('Yes')).toBeTruthy();
    fireEvent.press(button());

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reports its selected state and draws it purple', () => {
    setup({ selected: true });

    expect(button().props.accessibilityState).toEqual({ selected: true, disabled: false });
    expect(buttonStyle()).toMatchObject({ backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder });
  });

  it('draws a selected alert value pink', () => {
    setup({ selected: true, alert: true });

    expect(buttonStyle()).toMatchObject({ backgroundColor: colors.controlAlertBg, borderColor: colors.controlAlertBorder });
  });

  it('ignores presses when disabled, and looks disabled', () => {
    const onPress = setup({ disabled: true });

    fireEvent.press(button());

    expect(onPress).not.toHaveBeenCalled();
    expect(button().props.accessibilityState.disabled).toBe(true);
    expect(buttonStyle().backgroundColor).toBe(colors.controlDisabledBg);
  });

  it('ignores presses when read-only but keeps its selected look', () => {
    const onPress = setup({ selected: true, readOnly: true });

    fireEvent.press(button());

    expect(onPress).not.toHaveBeenCalled();
    expect(button().props.accessibilityState).toEqual({ selected: true, disabled: true });
    expect(buttonStyle().backgroundColor).toBe(colors.controlSelectedBg);
  });

  it('takes placement from the caller but keeps its own colours', () => {
    setup({}, { flex: 2 });

    expect(buttonStyle()).toMatchObject({ flex: 2, backgroundColor: colors.white, borderColor: colors.borderFigma });
  });
});
