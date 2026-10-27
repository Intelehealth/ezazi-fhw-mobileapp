import '@/core/i18n';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { getCardLayout } from '@ezazi/clinical-rules';
import type { MedicineAnswer, MedicineEntry } from '@ezazi/clinical-rules';

import { toTabViews } from '../../domain/captureFieldView';
import { MedicineField } from '../MedicineField';

const FIELD = toTabViews(getCardLayout('Stage1_Hour1_1')!, 'default')
  .flatMap((tab) => tab.fields)
  .find((field) => field.id === 'medicine')!;

const PARACETAMOL: MedicineEntry = {
  form: 'Tablet',
  name: 'Paracetamol',
  strength: '650 mg',
  dosage: '1',
  dosageUnit: 'Tab',
  frequency: 'Once daily',
  route: 'Oral',
  duration: '3',
  durationUnit: 'Days',
};

const setup = (answer: MedicineAnswer) => {
  const handlers = { onAnswer: jest.fn(), onAdd: jest.fn(), onUpdate: jest.fn(), onRemove: jest.fn() };
  render(<MedicineField field={FIELD} answer={answer} {...handlers} />);
  return handlers;
};

const pick = (label: string, option: string) => {
  fireEvent.press(screen.getByRole('button', { name: label }));
  fireEvent.press(screen.getByRole('radio', { name: option }));
};

describe('MedicineField', () => {
  it('opens the Add Medicine form after Yes with no medicine yet', () => {
    setup({ answer: 'yes', medicines: [] });
    expect(screen.getByText('ADD MEDICINE')).toBeTruthy();
  });

  it('keeps Add disabled until Android\'s required inputs are filled, then adds', async () => {
    const { onAdd } = setup({ answer: 'yes', medicines: [] });
    expect(screen.getByRole('button', { name: 'Add' }).props.accessibilityState.disabled).toBe(true);

    pick('Medicine*', 'Tablet Paracetamol 650 mg');
    fireEvent.changeText(screen.getByLabelText('Dose*'), '1');
    fireEvent.press(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Paracetamol', form: 'Tablet', strength: '650 mg', dosageUnit: 'Tab', route: 'Oral', dosage: '1' }),
      ),
    );
  });

  it('lists added medicines, each editable and removable', () => {
    const { onRemove } = setup({ answer: 'yes', medicines: [PARACETAMOL] });
    expect(screen.getByText('Paracetamol · 650 mg · 1 Tab · Oral')).toBeTruthy();
    expect(screen.queryByText('ADD MEDICINE')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Remove medicine' }));
    expect(onRemove).toHaveBeenCalledWith(0);

    fireEvent.press(screen.getByRole('button', { name: 'Edit medicine' }));
    expect(screen.getByText('ADD MEDICINE')).toBeTruthy();
  });

  it('shows nothing after No', () => {
    setup({ answer: 'no', medicines: [] });
    expect(screen.queryByText('ADD MEDICINE')).toBeNull();
  });
});
