import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { colors } from '@/core/config/theme';

import { NumberChips } from '../NumberChips';
import { SegmentedChoice } from '../SegmentedChoice';

const OPTIONS = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No', alert: true },
];

const styleOf = (name: string) => StyleSheet.flatten(screen.getByRole('radio', { name }).props.style);

describe.each([
  ['SegmentedChoice', SegmentedChoice],
  ['NumberChips', NumberChips],
])('%s', (_name, Control) => {
  it('shows every option and reports the one picked', () => {
    const onChange = jest.fn();
    render(<Control options={OPTIONS} value={null} onChange={onChange} />);

    fireEvent.press(screen.getByRole('radio', { name: 'No' }));

    expect(onChange).toHaveBeenCalledWith('No');
    expect(screen.getByRole('radio', { name: 'Yes' }).props.accessibilityState.selected).toBe(false);
  });

  it('marks the selected option, pink when it is an alert value', () => {
    const { rerender } = render(<Control options={OPTIONS} value="Yes" onChange={jest.fn()} />);
    expect(styleOf('Yes').backgroundColor).toBe(colors.controlSelectedBg);

    rerender(<Control options={OPTIONS} value="No" onChange={jest.fn()} />);
    expect(styleOf('No').backgroundColor).toBe(colors.controlAlertBg);
  });

  it('outlines every option in red on error, and ignores presses when disabled', () => {
    const onChange = jest.fn();
    const { rerender } = render(<Control options={OPTIONS} value={null} onChange={onChange} error />);
    expect(styleOf('Yes').borderColor).toBe(colors.alertFigma);

    rerender(<Control options={OPTIONS} value={null} onChange={onChange} disabled />);
    fireEvent.press(screen.getByRole('radio', { name: 'Yes' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
