import '@/core/i18n';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { getCardLayout } from '@ezazi/clinical-rules';

import { useCaptureForm } from '../useCaptureForm';

const LAYOUT = getCardLayout('Stage1_Hour1_1')!;
const setup = () => renderHook(() => useCaptureForm(LAYOUT, 'default'));

describe('useCaptureForm', () => {
  it('stores a value and flags an Android alert value', () => {
    const { result } = setup();
    act(() => result.current.api.setValue('companion', 'N'));

    expect(result.current.api.fieldValue('companion')).toBe('N');
    expect(result.current.api.fieldAlert('companion')).toBe(true);
    expect(result.current.api.summary.find((s) => s.labelKey === 'partogram.section.supportiveCare')?.items[0]?.value).toBe('No');
  });

  it('keeps Supervisor / Doctor to Android\'s characters, first letter upper case', () => {
    const { result } = setup();
    act(() => result.current.api.setValue('supervisorDoctor', 'dr rao ✓'));
    expect(result.current.api.fieldValue('supervisorDoctor')).toBe('Dr rao ');
  });

  it('shows a range error once the value has the maximum\'s digits, not before (Figma "Record 24")', () => {
    const { result } = setup();
    act(() => result.current.api.setValue('baselineFhr', '25'));
    expect(result.current.api.fieldError('baselineFhr')).toBeUndefined();

    act(() => result.current.api.setValue('baselineFhr', '250'));
    expect(result.current.api.fieldError('baselineFhr')).toBe('Please enter Baseline FHR in between 90 and 220');

    act(() => result.current.api.setValue('baselineFhr', '140'));
    expect(result.current.api.fieldError('baselineFhr')).toBeUndefined();
  });

  it('checks a short value when its box is left, and nothing for an empty box', () => {
    const { result } = setup();
    act(() => result.current.api.setValue('pulse', '25'));
    act(() => result.current.api.leaveField('pulse'));
    expect(result.current.api.fieldError('pulse')).toBe('Please enter Pulse in between 30 and 250');

    act(() => result.current.api.setValue('pulse', ''));
    act(() => result.current.api.leaveField('pulse'));
    expect(result.current.api.fieldError('pulse')).toBeUndefined();
  });

  it('clears a diastolic typed before systolic, with Android\'s message under it', () => {
    const { result } = setup();
    act(() => result.current.api.setValue('diastolicBp', '80'));

    expect(result.current.api.fieldValue('diastolicBp')).toBe('');
    expect(result.current.api.fieldError('diastolicBp')).toBe('Enter Systolic BP before Diastolic BP');
  });

  it('clears a diastolic when systolic is lowered below it', () => {
    const { result } = setup();
    act(() => result.current.api.setValue('systolicBp', '120'));
    act(() => result.current.api.setValue('diastolicBp', '80'));
    act(() => result.current.api.setValue('systolicBp', '70'));
    expect(result.current.api.fieldValue('diastolicBp')).toBe('');
  });

  it('clears an Oxytocin strength out of range, and warns on a rate still below the minimum', () => {
    const { result } = setup();
    act(() => result.current.api.setInfusionAnswer('oxytocin', 'yes'));
    act(() => result.current.api.setInfusionInput('oxytocin', 'oxytocinStrength', '99'));
    expect(result.current.api.infusionAnswer('oxytocin').entry.strength).toBe('');
    expect(result.current.api.infusionErrors('oxytocin').oxytocinStrength).toMatch(/^Strength must be in range of/);

    act(() => result.current.api.setInfusionInput('oxytocin', 'infusionRate', '1'));
    expect(result.current.api.infusionAnswer('oxytocin').entry.infusionRate).toBe('1');
    expect(result.current.api.infusionErrors('oxytocin').infusionRate).toMatch(/^Infusion Rate must be in range of/);
  });

  it('clears a rate still below the minimum when its box is left, as Android does', () => {
    const { result } = setup();
    act(() => result.current.api.setInfusionAnswer('ivFluids', 'yes'));
    act(() => result.current.api.setInfusionInput('ivFluids', 'infusionRate', '1'));
    act(() => result.current.api.checkInfusionRateOnLeave('ivFluids'));

    expect(result.current.api.infusionAnswer('ivFluids').entry.infusionRate).toBe('');
    expect(result.current.api.infusionErrors('ivFluids').infusionRate).toMatch(/^Infusion Rate must be in range of/);
  });

  it('keeps a rate in range when its box is left', () => {
    const { result } = setup();
    act(() => result.current.api.setInfusionAnswer('ivFluids', 'yes'));
    act(() => result.current.api.setInfusionInput('ivFluids', 'infusionRate', '30'));
    act(() => result.current.api.checkInfusionRateOnLeave('ivFluids'));

    expect(result.current.api.infusionAnswer('ivFluids').entry.infusionRate).toBe('30');
    expect(result.current.api.infusionErrors('ivFluids').infusionRate).toBeUndefined();
  });

  it('stores IV fluid "Other" only with its text, and clears the text on a listed fluid (Android)', () => {
    const { result } = setup();
    act(() => result.current.api.setInfusionAnswer('ivFluids', 'yes'));
    act(() => result.current.api.setInfusionInput('ivFluids', 'ivFluidType', 'Other'));
    expect(result.current.api.infusionAnswer('ivFluids').entry.type).toBeUndefined();

    act(() => result.current.api.setInfusionInput('ivFluids', 'otherType', 'plasma'));
    expect(result.current.api.infusionAnswer('ivFluids').entry).toMatchObject({ type: 'Other', otherType: 'Plasma' });

    act(() => result.current.api.setInfusionInput('ivFluids', 'ivFluidType', 'Normal Saline'));
    expect(result.current.api.infusionAnswer('ivFluids').entry).toEqual({ type: 'Normal Saline', otherType: undefined });
  });

  it('turns unanswered Medication answers into "No" once the tab is shown', () => {
    const { result } = setup();
    expect(result.current.api.medicine.answer).toBeNull();
    act(() => result.current.showMedication());
    expect(result.current.api.medicine.answer).toBe('no');
    expect(result.current.api.infusionAnswer('oxytocin').answer).toBe('no');
  });

  it('adds, edits and removes medicines and notes', () => {
    const { result } = setup();
    const medicine = { form: 'Tablet', name: 'Paracetamol', strength: '650 mg', dosage: '1', dosageUnit: 'Tab', frequency: '', route: 'Oral', duration: '', durationUnit: '' };
    act(() => result.current.api.setMedicineAnswer('yes'));
    act(() => result.current.api.addMedicine(medicine));
    act(() => result.current.api.updateMedicine(0, { ...medicine, dosage: '2' }));
    expect(result.current.api.medicine.medicines).toEqual([{ ...medicine, dosage: '2' }]);
    act(() => result.current.api.removeMedicine(0));
    expect(result.current.api.medicine.medicines).toEqual([]);

    act(() => result.current.api.addNote('plan', 'Review in 1 hour'));
    expect(result.current.api.fieldNotes('plan')).toEqual(['Review in 1 hour']);
    act(() => result.current.api.removeNote('plan', 0));
    expect(result.current.api.fieldNotes('plan')).toEqual([]);
  });

  it('blocks Save on Android\'s rules, names the first tab in error and counts errors per tab', async () => {
    const { result } = setup();
    const onValid = jest.fn();
    const onInvalid = jest.fn();
    act(() => result.current.api.setMedicineAnswer('yes'));
    act(() => result.current.api.setValue('pulse', '20'));
    act(() => result.current.submit(onValid, onInvalid));

    await waitFor(() => expect(onInvalid).toHaveBeenCalledWith('woman'));
    expect(onValid).not.toHaveBeenCalled();
    expect(result.current.tabErrorCounts).toEqual({ woman: 1, medication: 1 });
    expect(result.current.api.fieldError('medicine')).toMatch(/^Please add at least 1 medicine/);
  });

  it('saves a valid card', async () => {
    const { result } = setup();
    const onValid = jest.fn();
    act(() => result.current.api.setValue('pulse', '80'));
    act(() => result.current.submit(onValid, jest.fn()));
    await waitFor(() => expect(onValid).toHaveBeenCalledWith(expect.objectContaining({ values: expect.objectContaining({ pulse: '80' }) })));
  });
});
