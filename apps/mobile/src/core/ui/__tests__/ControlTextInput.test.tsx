import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { colors } from '@/core/config/theme';

import { ControlTextInput } from '../ControlTextInput';

describe('ControlTextInput', () => {
  it('reports typed text and shows a right slot', () => {
    const onChangeText = jest.fn();
    render(<ControlTextInput label="Remark" value="" onChangeText={onChangeText} rightSlot={<Text>+ Add</Text>} />);

    fireEvent.changeText(screen.getByLabelText('Remark'), 'After food');

    expect(onChangeText).toHaveBeenCalledWith('After food');
    expect(screen.getByText('+ Add')).toBeTruthy();
  });

  it('cannot be typed in when disabled', () => {
    render(<ControlTextInput label="Remark" value="" onChangeText={jest.fn()} disabled />);
    expect(screen.getByLabelText('Remark').props.editable).toBe(false);
  });

  it('is outlined in red on error, and in the Figma border otherwise', () => {
    const { rerender } = render(<ControlTextInput label="Remark" value="" onChangeText={jest.fn()} error />);
    expect(JSON.stringify(screen.toJSON())).toContain(colors.alertFigma);

    rerender(<ControlTextInput label="Remark" value="" onChangeText={jest.fn()} />);
    expect(JSON.stringify(screen.toJSON())).not.toContain(colors.alertFigma);
  });
});
