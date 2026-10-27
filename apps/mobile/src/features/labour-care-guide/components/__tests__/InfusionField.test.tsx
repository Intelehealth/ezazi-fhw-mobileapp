import '@/core/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { getCardLayout, getStepperSpec } from '@ezazi/clinical-rules';
import type { InfusionAnswer } from '@ezazi/clinical-rules';

import { toTabViews } from '../../domain/captureFieldView';
import { InfusionField } from '../InfusionField';

const fieldOf = (id: string) =>
  toTabViews(getCardLayout('Stage1_Hour1_1')!, 'default')
    .flatMap((tab) => tab.fields)
    .find((field) => field.id === id)!;

const BOUNDS = { strength: getStepperSpec('oxytocinStrength', 'default'), rate: getStepperSpec('infusionRate', 'default') };

const setup = (id: 'oxytocin' | 'ivFluids', answer: InfusionAnswer, errors = {}) => {
  const handlers = { onAnswer: jest.fn(), onInput: jest.fn() };
  render(<InfusionField field={fieldOf(id)} answer={answer} bounds={BOUNDS} errors={errors} {...handlers} />);
  return handlers;
};

describe('InfusionField', () => {
  it('shows only Yes / No while the answer is No', () => {
    const { onAnswer } = setup('oxytocin', { answer: 'no', entry: {} });
    expect(screen.queryByLabelText('Strength (U/L)')).toBeNull();
    fireEvent.press(screen.getByRole('radio', { name: 'Yes' }));
    expect(onAnswer).toHaveBeenCalledWith('yes');
  });

  it('asks Oxytocin for strength, rate and status after Yes', () => {
    const { onInput } = setup('oxytocin', { answer: 'yes', entry: {} });
    expect(screen.getByLabelText('Strength (U/L)')).toBeTruthy();
    expect(screen.getByLabelText('IV infusion rate (drops/minute)')).toBeTruthy();
    expect(screen.queryByText('TYPE OF IV FLUID')).toBeNull();

    fireEvent.press(screen.getByRole('radio', { name: 'Continued' }));
    expect(onInput).toHaveBeenCalledWith('infusionStatus', 'Continued');
  });

  it('asks IV Fluids for its type, and a text for Other', () => {
    const { onInput } = setup('ivFluids', { answer: 'yes', entry: { type: 'Other' } });
    expect(screen.queryByLabelText('Strength (U/L)')).toBeNull();
    fireEvent.press(screen.getByRole('radio', { name: 'Normal Saline' }));
    expect(onInput).toHaveBeenCalledWith('ivFluidType', 'Normal Saline');

    fireEvent.changeText(screen.getByLabelText('Type of IV fluid'), 'Plasma');
    expect(onInput).toHaveBeenCalledWith('otherType', 'Plasma');
  });

  it('shows a sub-input\'s error under it', () => {
    setup('oxytocin', { answer: 'yes', entry: {} }, { infusionRate: 'Infusion Rate must be in range of 10 to 60' });
    expect(screen.getByText('Infusion Rate must be in range of 10 to 60')).toBeTruthy();
  });
});
