import { describe, it, expect } from 'vitest';
import { getCardErrors } from '../saveRules';
import { getValidationRanges } from '../../ranges/rangeProfiles';
import type { CardInput, InfusionAnswer, MedicineAnswer } from '../types';
import type { InfusionEntry } from '../../storage/infusionJson';
import type { MedicineEntry } from '../../storage/medicineText';

/**
 * Oracle: a literal port of Android's Save chain (`PartogramDataCaptureActivity.saveObs` 711-733,
 * `ValidatePartogramFields`, `Medication`, `ParamInfo`), with Android's own numbers. Returns the
 * Android message shown, or null when the card saves.
 */
function androidSave(card: CardInput): string | null {
  const v = card.values;
  const filled = (s: string | null | undefined): s is string => s != null && s.length > 0;
  const infusionOk = (e: InfusionEntry) =>
    filled(e.infusionRate) && filled(e.infusionStatus) && +e.infusionRate >= 5 && +e.infusionRate <= 60;
  const oxytocinOk = card.oxytocin?.answer !== 'yes' || (filled(card.oxytocin.entry.strength) && infusionOk(card.oxytocin.entry));
  const ivOk = card.ivFluids?.answer !== 'yes' || (filled(card.ivFluids.entry.type) && infusionOk(card.ivFluids.entry));
  const medicineOk = card.medicine?.answer !== 'yes' || card.medicine.medicines.length > 0;
  const param = (s: string | null | undefined, min: number, max: number) => !filled(s) || (+s >= min && +s <= max);
  const sbp = v.systolicBp;
  const dbp = v.diastolicBp;
  const dbpOk = !filled(sbp) || !filled(dbp) || (+dbp >= 20 && +dbp <= 180 && +dbp < +sbp);

  if (!oxytocinOk) return 'error_oxytocin';
  if (!ivOk) return 'error_iv_fluid';
  if (!medicineOk) return 'error_medicine';
  if (!param(v.baselineFhr, 90, 220)) return 'baseline_fhr_err';
  if (!param(v.pulse, 30, 250)) return 'pulse_err';
  if (!param(sbp, 30, 300)) return 'systolic_bp_range_toast_err';
  if (!dbpOk) return 'diastolic_bp_range_toast_err';
  if (!param(v.temperature, 89.6, 109.0)) return 'temp_error_new';
  if (!param(v.contractionDuration, 0, 100)) return 'contraction_duration_err';
  return null;
}

const ANDROID_MESSAGE_OF: Record<string, string> = {
  oxytocin: 'error_oxytocin',
  ivFluids: 'error_iv_fluid',
  medicine: 'error_medicine',
  baselineFhr: 'baseline_fhr_err',
  pulse: 'pulse_err',
  systolicBp: 'systolic_bp_range_toast_err',
  diastolicBp: 'diastolic_bp_range_toast_err',
  temperature: 'temp_error_new',
  contractionDuration: 'contraction_duration_err',
};

const packageSave = (card: CardInput): string | null => {
  const first = getCardErrors(card, 'default')[0];
  return first ? ANDROID_MESSAGE_OF[first.id] : null;
};

const MEDICINE: MedicineEntry = {
  form: 'Tablet',
  name: 'Paracetamol',
  strength: '500 mg',
  dosage: '1',
  dosageUnit: 'Tablet',
  frequency: 'Once',
  route: 'Oral',
  duration: '1',
  durationUnit: 'Days',
};

const yes = (entry: InfusionEntry): InfusionAnswer => ({ answer: 'yes', entry });
const OXYTOCIN_CASES: (InfusionAnswer | undefined)[] = [
  undefined,
  { answer: null, entry: {} },
  { answer: 'no', entry: {} },
  yes({}),
  yes({ strength: '5', infusionRate: '20', infusionStatus: 'Started' }),
  yes({ infusionRate: '20', infusionStatus: 'Started' }),
  yes({ strength: '5', infusionRate: '4', infusionStatus: 'Started' }),
  yes({ strength: '5', infusionRate: '5', infusionStatus: 'Started' }),
  yes({ strength: '5', infusionRate: '60', infusionStatus: 'Stopped' }),
  yes({ strength: '5', infusionRate: '61', infusionStatus: 'Started' }),
  yes({ strength: '5', infusionRate: '20' }),
];
const IV_CASES: (InfusionAnswer | undefined)[] = [
  undefined,
  { answer: 'no', entry: {} },
  yes({ type: 'Normal Saline', infusionRate: '30', infusionStatus: 'Continued' }),
  yes({ type: 'Other', otherType: 'Glucose', infusionRate: '30', infusionStatus: 'Started' }),
  yes({ infusionRate: '30', infusionStatus: 'Started' }),
  yes({ type: 'Normal Saline', infusionRate: '', infusionStatus: 'Started' }),
];
const MEDICINE_CASES: (MedicineAnswer | undefined)[] = [
  undefined,
  { answer: 'no', medicines: [] },
  { answer: 'yes', medicines: [] },
  { answer: 'yes', medicines: [MEDICINE] },
];

const GRID = {
  baselineFhr: ['', '89', '90', '150', '220', '221'],
  pulse: ['', '29', '30', '250', '251'],
  systolicBp: ['', '29', '30', '120', '300', '301'],
  diastolicBp: ['', '19', '20', '80', '119', '120', '180', '181'],
  temperature: ['', '89.5', '89.6', '98.6', '109', '109.0', '109.1'],
  contractionDuration: ['', '0', '45', '100', '101'],
};

describe('getCardErrors against the Android Save chain', () => {
  it('shows the same first message as Android for every value combination', () => {
    let index = 0;
    let checked = 0;
    for (const baselineFhr of GRID.baselineFhr)
      for (const pulse of GRID.pulse)
        for (const systolicBp of GRID.systolicBp)
          for (const diastolicBp of GRID.diastolicBp)
            for (const temperature of GRID.temperature)
              for (const contractionDuration of GRID.contractionDuration) {
                index += 1;
                const card: CardInput = {
                  values: { baselineFhr, pulse, systolicBp, diastolicBp, temperature, contractionDuration },
                  oxytocin: OXYTOCIN_CASES[index % OXYTOCIN_CASES.length],
                  ivFluids: IV_CASES[index % IV_CASES.length],
                  medicine: MEDICINE_CASES[index % MEDICINE_CASES.length],
                };
                expect(packageSave(card)).toBe(androidSave(card));
                checked += 1;
              }
    expect(checked).toBe(6 * 5 * 6 * 8 * 7 * 5);
  });

  it('matches Android for every infusion and medicine answer combination', () => {
    for (const oxytocin of OXYTOCIN_CASES)
      for (const ivFluids of IV_CASES)
        for (const medicine of MEDICINE_CASES) {
          const card: CardInput = { values: {}, oxytocin, ivFluids, medicine };
          expect(packageSave(card)).toBe(androidSave(card));
        }
  });
});

describe('getCardErrors details', () => {
  it('saves an empty card: every field is optional', () => {
    expect(getCardErrors({ values: {} }, 'default')).toEqual([]);
  });

  it('lists every error in Android order, not only the first', () => {
    const errors = getCardErrors(
      { values: { baselineFhr: '300', temperature: '120' }, medicine: { answer: 'yes', medicines: [] } },
      'default',
    );
    expect(errors.map((e) => [e.id, e.reason])).toEqual([
      ['medicine', 'medicineMissing'],
      ['baselineFhr', 'outOfRange'],
      ['temperature', 'outOfRange'],
    ]);
  });

  it('hands back the range and a message key for the error text', () => {
    const [error] = getCardErrors({ values: { pulse: '20' } }, 'default');
    expect(error).toEqual({
      id: 'pulse',
      reason: 'outOfRange',
      range: getValidationRanges('default').pulse,
      messageKey: 'partogram.validation.pulse.outOfRange',
    });
  });

  it('separates the two diastolic reasons Android shows in one message', () => {
    const reason = (systolicBp: string, diastolicBp: string) =>
      getCardErrors({ values: { systolicBp, diastolicBp } }, 'default')[0]?.reason;
    expect(reason('120', '181')).toBe('outOfRange');
    expect(reason('120', '120')).toBe('notBelowSystolic');
    expect(reason('120', '119')).toBeUndefined();
    expect(reason('', '181')).toBeUndefined(); // Android skips diastolic when systolic is empty
  });

  it('trims like Android captures values, and reports text that is not a number', () => {
    expect(getCardErrors({ values: { pulse: ' 80 ' } }, 'default')).toEqual([]);
    expect(getCardErrors({ values: { pulse: '   ' } }, 'default')).toEqual([]);
    expect(getCardErrors({ values: { pulse: '8o' } }, 'default')[0]?.reason).toBe('notANumber');
    expect(getCardErrors({ values: { systolicBp: '12.5' } }, 'default')[0]?.reason).toBe('notANumber');
  });

  it('does not range-check contractions per 10 minutes (Android has no Save check)', () => {
    expect(getCardErrors({ values: { contractionsPer10Min: '9' } }, 'default')).toEqual([]);
  });

  it('gives the same result for every client profile while all profiles are Android', () => {
    const card: CardInput = { values: { baselineFhr: '221', diastolicBp: '90', systolicBp: '80' } };
    expect(getCardErrors(card, 'nepal')).toEqual(getCardErrors(card, 'default'));
  });
});
