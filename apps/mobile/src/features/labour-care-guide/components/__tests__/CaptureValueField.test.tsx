import '@/core/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { getCardLayout } from '@ezazi/clinical-rules';

import { toTabViews } from '../../domain/captureFieldView';
import { CaptureValueField } from '../CaptureValueField';

const fieldOf = (id: string) =>
  toTabViews(getCardLayout('Stage1_Hour1_1')!, 'default')
    .flatMap((tab) => tab.fields)
    .find((field) => field.id === id)!;

const setup = (id: string, value = '', extra: { alert?: boolean; error?: string } = {}) => {
  const onChange = jest.fn();
  render(<CaptureValueField field={fieldOf(id)} value={value} onChange={onChange} alert={!!extra.alert} error={extra.error} />);
  return onChange;
};

describe('CaptureValueField', () => {
  it('draws option buttons with Android\'s labels and stores Android\'s value', () => {
    const onChange = setup('companion');
    expect(screen.getByText('COMPANION')).toBeTruthy();
    fireEvent.press(screen.getByRole('radio', { name: 'Woman declines' }));
    expect(onChange).toHaveBeenCalledWith('D');
  });

  it('draws a picker for a long list', () => {
    setup('amnioticFluid');
    expect(screen.getByRole('button', { name: 'Amniotic fluid' })).toBeTruthy();
    expect(screen.getByText('Select')).toBeTruthy();
  });

  it('draws number chips for Cervix', () => {
    const onChange = setup('cervix');
    fireEvent.press(screen.getByRole('radio', { name: '7' }));
    expect(onChange).toHaveBeenCalledWith('7');
  });

  it('draws a stepper that starts at the field\'s base', () => {
    const onChange = setup('baselineFhr');
    fireEvent.press(screen.getByRole('button', { name: 'Increase Baseline FHR (bpm)' }));
    expect(onChange).toHaveBeenCalledWith('110');
  });

  it('draws a text box for Supervisor / Doctor', () => {
    const onChange = setup('supervisorDoctor');
    fireEvent.changeText(screen.getByLabelText('Supervisor / Doctor'), 'Dr Rao');
    expect(onChange).toHaveBeenCalledWith('Dr Rao');
  });

  it('shows the error under the control', () => {
    setup('pulse', '20', { error: 'Please enter Pulse in between 30 and 250' });
    expect(screen.getByText('Please enter Pulse in between 30 and 250')).toBeTruthy();
  });
});
