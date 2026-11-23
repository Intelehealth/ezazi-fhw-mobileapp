import '@/core/i18n';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { MedicineEntry } from '@ezazi/clinical-rules';

import { MedicineForm } from '../MedicineForm';

const PARACETAMOL: MedicineEntry = {
  form: 'Tablet',
  name: 'Paracetamol',
  strength: '650 mg',
  dosage: '1',
  dosageUnit: 'Tab',
  frequency: 'Once daily (OD)',
  route: 'Oral',
  duration: '3',
  durationUnit: 'Days',
};

const FIELDS = [
  'Medicine*',
  'Form*',
  'Strength*',
  'Dose*',
  'Dose Unit*',
  'Frequency*',
  'Route*',
  'Duration*',
  'Duration Unit*',
  'Remark',
];

const setup = (initial?: MedicineEntry) => {
  const handlers = { onSubmit: jest.fn(), onCancel: jest.fn() };
  render(<MedicineForm initial={initial} {...handlers} />);
  return handlers;
};

const pick = (label: string, option: string) => {
  fireEvent.press(screen.getByRole('button', { name: label }));
  fireEvent.press(screen.getByRole('radio', { name: option }));
};

const shown = (label: string) => screen.getByRole('button', { name: label }).props.accessibilityValue.text;
const addDisabled = () => screen.getByRole('button', { name: 'Add' }).props.accessibilityState.disabled;

/** Android's Add Medicine form: ten inputs, catalogue autofill, Add only once the required ones are filled. */
describe('MedicineForm', () => {
  it('shows all ten inputs, empty, with Add disabled', () => {
    setup();

    expect(screen.getByText('ADD MEDICINE')).toBeTruthy();
    for (const label of FIELDS) expect(screen.getByLabelText(label)).toBeTruthy();
    expect(screen.getByText('DOSE UNIT*')).toBeTruthy(); // FormField captions are upper-cased
    expect(shown('Medicine*')).toBe('Select');
    expect(addDisabled()).toBe(true);
  });

  it('cancels without submitting', () => {
    const { onSubmit, onCancel } = setup();

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('fills form, strength, dose unit and route from a catalogue medicine', () => {
    setup();

    pick('Medicine*', 'Tablet Paracetamol 650 mg');

    expect(shown('Medicine*')).toBe('Paracetamol');
    expect(shown('Form*')).toBe('Tablet');
    expect(shown('Strength*')).toBe('650 mg');
    expect(shown('Dose Unit*')).toBe('Tab');
    expect(shown('Route*')).toBe('Oral');
  });

  it('keeps Add disabled until the dose, Duration and its unit are given, keeps only digits, then adds', async () => {
    const { onSubmit } = setup();
    pick('Medicine*', 'Tablet Paracetamol 650 mg');
    expect(addDisabled()).toBe(true);

    fireEvent.changeText(screen.getByLabelText('Dose*'), '2 tabs');
    expect(screen.getByLabelText('Dose*').props.value).toBe('2');
    // Android stops here; RN also requires Duration and its unit (open point 19, Kaveri 2026-11-18).
    await waitFor(() => expect(addDisabled()).toBe(true));
    fireEvent.changeText(screen.getByLabelText('Duration*'), '3');
    pick('Duration Unit*', 'Days');
    await waitFor(() => expect(addDisabled()).toBe(false));

    fireEvent.press(screen.getByRole('button', { name: 'Add' }));

    // Frequency is not required, as Android; an empty remark is left out.
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Paracetamol',
        form: 'Tablet',
        strength: '650 mg',
        dosage: '2',
        dosageUnit: 'Tab',
        frequency: '',
        route: 'Oral',
        duration: '3',
        durationUnit: 'Days',
        remark: undefined,
      }),
    );
  });

  it('keeps a typed medicine name that is not in the catalogue, filling nothing else', () => {
    setup();

    fireEvent.press(screen.getByRole('button', { name: 'Medicine*' }));
    fireEvent.changeText(screen.getByLabelText('Search Medicine*'), 'homemade syrup');
    fireEvent.press(screen.getByText('Use “homemade syrup”'));

    expect(shown('Medicine*')).toBe('Homemade syrup');
    expect(shown('Form*')).toBe('Select');
    expect(shown('Route*')).toBe('Select');
  });

  it('opens with the medicine being edited, ready to save, and returns the edits', async () => {
    const { onSubmit } = setup({ ...PARACETAMOL, remark: 'After food' });

    expect(shown('Medicine*')).toBe('Paracetamol');
    expect(shown('Frequency*')).toBe('Once daily (OD)');
    expect(shown('Duration Unit*')).toBe('Days');
    expect(screen.getByLabelText('Duration*').props.value).toBe('3');
    expect(screen.getByLabelText('Remark').props.value).toBe('After food');
    await waitFor(() => expect(addDisabled()).toBe(false));

    pick('Route*', 'Intravenous (IV)');
    fireEvent.changeText(screen.getByLabelText('Remark'), 'with water');
    fireEvent.press(screen.getByRole('button', { name: 'Add' }));

    // The remark goes through Android's first-letter-upper-case filter.
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ ...PARACETAMOL, route: 'Intravenous (IV)', remark: 'With water' }),
    );
  });

  it('disables Add again when a required input is cleared', () => {
    setup(PARACETAMOL);

    fireEvent.changeText(screen.getByLabelText('Dose*'), '');

    expect(addDisabled()).toBe(true);
  });
});
