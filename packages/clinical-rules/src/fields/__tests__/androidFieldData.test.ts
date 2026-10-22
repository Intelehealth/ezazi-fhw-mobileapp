import { describe, it, expect } from 'vitest';
import { STAGE1_AND_2_FIELDS } from '../stage1And2Fields';
import { getFieldOptions } from '../cardFields';
import {
  INFUSION_INPUT_LABELS,
  INFUSION_STATUS_OPTIONS,
  IV_FLUID_TYPE_OPTIONS,
  OTHER_TYPE_TEXT,
} from '../infusionInputs';
import { IV_FLUID_OTHER_VALUE } from '../../constants';
import { INFUSION_INPUT_LIMITS } from '../../ranges/inputLimits';
import type { FieldDefinition } from '../types';

// Literal copies of Android PartogramConstants.java 120-481 (8185b00), kept independent of the port.
// [id, section, label, conceptKey, type code, stage1 flags, stage2 flags, [stored value, option label][]]
type Row = [string, string, string, string, string, string, string, [string, string][]];
const YND: [string, string][] = [['Y', 'Yes'], ['N', 'No'], ['D', 'Woman Declines']];
const ANDROID: Row[] = [
  ['companion', 'supportiveCare', 'Companion', 'COMPANION', 'A', 'onlyOneHour', 'onlyOneHour', YND],
  ['painRelief', 'supportiveCare', 'Pain relief', 'PAIN_RELIEF', 'A', 'onlyOneHour', 'onlyOneHour', YND],
  ['oralFluid', 'supportiveCare', 'Oral Fluid', 'ORAL_FLUID', 'A', 'onlyOneHour', 'onlyOneHour', YND],
  ['posture', 'supportiveCare', 'Posture', 'POSTURE', 'A', 'onlyOneHour', 'onlyOneHour', [['SP', 'Supine'], ['MO', 'Mobile']]],
  ['baselineFhr', 'baby', 'Baseline FHR', 'BASELINE_FHR', 'G', 'halfHour+fifteenMin', 'halfHour+fifteenMin', []],
  ['fhrDeceleration', 'baby', 'FHR Deceleration', 'FHR_DECELERATION', 'A', 'halfHour+fifteenMin', 'halfHour+fifteenMin',
    [['N', 'No'], ['E', 'Early'], ['L', 'Late'], ['V', 'Variable']]],
  ['amnioticFluid', 'baby', 'Amniotic Fluid', 'AMNIOTIC_FLUID', 'A', 'fiveHour', 'fiveHour', [
    ['I', 'I (Intact)'], ['C', 'C (Clear fluid)'], ['M+', 'M+ (Meconium stained fluid-Nonsignificant)'],
    ['M++', 'M++ (Meconium stained fluid-Medium)'], ['M+++', 'M+++ (Meconium stained fluid-Thick)'], ['B', 'B (Blood stained)']]],
  ['fetalPosition', 'baby', 'Fetal Position', 'FETAL_POSITION', 'A', 'fiveHour', 'fiveHour',
    [['A', 'A (Occiput anterior)'], ['P', 'P (Occiput posterior)'], ['T', 'T (Occiput transverse)']]],
  ['caput', 'baby', 'Caput', 'CAPUT', 'A', 'fiveHour', 'fiveHour', [['0', '0 (None)'], ['+', '+'], ['++', '++'], ['+++', '+++ (Marked)']]],
  ['moulding', 'baby', 'Moulding', 'MOULDING', 'A', 'fiveHour', 'fiveHour', [['0', '0 (None)'], ['+', '+ (Sutures apposed)'],
    ['++', '++ (Sutures overlapped but reducible)'], ['+++', '+++ (Sutures overlapped but not reducible)']]],
  ['pulse', 'woman', 'Pulse', 'PULSE', 'G', 'fiveHour', 'fiveHour', []],
  ['systolicBp', 'woman', 'Systolic BP', 'SYSTOLIC_BP', 'G', 'fiveHour', 'fiveHour', []],
  ['diastolicBp', 'woman', 'Diastolic BP', 'DIASTOLIC_BP', 'G', 'fiveHour', 'fiveHour', []],
  ['temperature', 'woman', 'Temperature (°F)', 'TEMPERATURE', 'H', 'fiveHour', 'fiveHour', []],
  ['urineProtein', 'woman', 'Urine protein', 'URINE_PROTEIN', 'A', 'fiveHour', 'fiveHour', [['Negative', 'No Proteinuria (P-)'],
    ['Trace', 'Trace of Proteinuria (P Trace)'], ['P1+', 'P1+'], ['P2+', 'P2+'], ['P3+', 'P3+'], ['P4+', 'P4+']]],
  ['urineAcetone', 'woman', 'Urine Acetone', 'URINE_ACETONE', 'A', 'fiveHour', 'fiveHour', [['Negative', 'No Acetonuria (A-)'],
    ['Trace', 'Trace of Acetonuria (A Trace)'], ['A1+', 'A1+'], ['A2+', 'A2+'], ['A3+', 'A3+'], ['A4+', 'A4+']]],
  ['contractionsPer10Min', 'labourProgress', 'Contractions per 10 min', 'CONTRACTIONS_PER_10MIN', 'E',
    'halfHour+fifteenMin', 'halfHour+fifteenMin', []],
  ['contractionDuration', 'labourProgress', 'Duration of contractions', 'DURATION_OF_CONTRACTION', 'G',
    'halfHour+fifteenMin', 'halfHour+fifteenMin', []],
  ['cervix', 'labourProgress', 'Cervix Plot[X]', 'CERVIX_PLOT_X', 'A', 'fiveHour', 'fifteenMin',
    [['10', '10'], ['9', '9'], ['8', '8'], ['7', '7'], ['6', '6'], ['5', '5']]],
  ['descent', 'labourProgress', 'Descent Plot[O]', 'DESCENT_PLOT_0', 'A', 'fiveHour', 'fifteenMin',
    [['5', '5'], ['4', '4'], ['3', '3'], ['2', '2'], ['1', '1'], ['0', '0']]],
  ['oxytocin', 'medication', 'Oxytocin (U/L, drops/min)', 'OXYTOCIN_UL_DROPS_MIN', 'I', 'eachEncounter', 'eachEncounter', []],
  ['medicine', 'medication', 'Medicine', 'MEDICINE', 'I', 'eachEncounter', 'eachEncounter', []],
  ['ivFluids', 'medication', 'IV Fluids', 'IV_FLUIDS', 'I', 'eachEncounter', 'eachEncounter', []],
  ['assessment', 'sharedDecisionMaking', 'Assessment', 'ASSESSMENT', 'I', 'eachEncounter', 'eachEncounter', []],
  ['plan', 'sharedDecisionMaking', 'Plan', 'PLAN', 'I', 'eachEncounter', 'eachEncounter', []],
  ['supervisorDoctor', 'sharedDecisionMaking', 'Supervisor Doctor', 'SUPERVISOR_DOCTOR', 'C', 'eachEncounter', 'eachEncounter', []],
];

const FREQUENCY_OF_FLAGS: Record<string, string> = {
  onlyOneHour: 'hourlyCards',
  'halfHour+fifteenMin': 'everyCard',
  fifteenMin: 'everyCard',
  eachEncounter: 'everyCard',
  fiveHour: 'examCards',
};
const KIND_OF_TYPE: Record<string, string> = { A: 'select', C: 'text', E: 'integer', G: 'integer', H: 'decimal' };
const fields = STAGE1_AND_2_FIELDS as readonly FieldDefinition[];

describe('Stage 1/2 fields, compared with literal Android data', () => {
  it('has the same 26 fields, in the same order, sections and labels', () => {
    expect(fields.map((f) => [f.id, f.section, f.androidLabel])).toEqual(ANDROID.map((r) => [r[0], r[1], r[2]]));
  });

  it('names the concept of every field with the agreed constant name', () => {
    expect(fields.map((f) => [f.id, f.conceptKey])).toEqual(ANDROID.map((r) => [r[0], r[3]]));
  });

  it("maps Android's five flags to the same frequency per stage", () => {
    expect(fields.map((f) => [f.id, f.frequency.stage1, f.frequency.stage2])).toEqual(
      ANDROID.map((r) => [r[0], FREQUENCY_OF_FLAGS[r[5]], FREQUENCY_OF_FLAGS[r[6]]]),
    );
  });

  it('uses the input kind of each Android type code (I = medication / notes)', () => {
    for (const [id, , , , code] of ANDROID) {
      const field = fields.find((f) => f.id === id) as FieldDefinition;
      if (code === 'I') expect(['infusion', 'medicineList', 'noteList']).toContain(field.input.kind);
      else expect(field.input.kind).toBe(KIND_OF_TYPE[code]);
    }
  });

  it('matches Android digit limits: E 1, G 3, H 5 chars with 3+1 digits', () => {
    const limit = (id: string) => {
      const input = fields.find((f) => f.id === id)?.input;
      return input && 'limits' in input ? input.limits : null;
    };
    expect(limit('contractionsPer10Min')).toMatchObject({ kind: 'integer', maxDigits: 1 });
    for (const id of ['baselineFhr', 'pulse', 'systolicBp', 'diastolicBp', 'contractionDuration']) {
      expect(limit(id)).toMatchObject({ kind: 'integer', maxDigits: 3 });
    }
    expect(limit('temperature')).toMatchObject({ maxLength: 5, maxIntegerDigits: 3, maxFractionDigits: 1 });
  });

  it('stores and labels every option exactly as Android, in Android order (Stage 1)', () => {
    for (const [id, , , , , , , options] of ANDROID) {
      const field = fields.find((f) => f.id === id) as FieldDefinition;
      expect(getFieldOptions(field, 'stage1').map((o) => [o.value, o.androidLabel])).toEqual(options);
    }
  });

  it('uses the Stage 1 options in Stage 2 too, except Cervix (Pushing / 10)', () => {
    for (const field of fields) {
      const stage2 = getFieldOptions(field, 'stage2').map((o) => [o.value, o.androidLabel]);
      if (field.id === 'cervix') expect(stage2).toEqual([['P', 'Pushing'], ['10', '10']]);
      else expect(stage2).toEqual(getFieldOptions(field, 'stage1').map((o) => [o.value, o.androidLabel]));
    }
  });

  it('gives Supervisor Doctor free text with Android\'s character filter', () => {
    expect(fields.find((f) => f.id === 'supervisorDoctor')?.input).toEqual({
      kind: 'text',
      characters: 'asciiLettersDigitsPunctuationSpace',
      capitalizeFirst: true,
    });
  });
});

describe('Oxytocin and IV Fluids inputs, compared with Android', () => {
  it('offers the infusion statuses of PartogramConstants.infusionStatus', () => {
    expect(INFUSION_STATUS_OPTIONS.map((o) => [o.value, o.androidLabel])).toEqual([
      ['Started', 'Started'],
      ['Continued', 'Continued'],
      ['Stopped', 'Stopped'],
    ]);
  });

  it('offers the IV fluid types, "Other IV Fluid*" stored as Other', () => {
    expect(IV_FLUID_TYPE_OPTIONS.map((o) => [o.value, o.androidLabel])).toEqual([
      ['Ringer Lactate', 'Ringer Lactate'],
      ['Normal Saline', 'Normal Saline'],
      ['Dextrose 5% (D5)', 'Dextrose 5% (D5)'],
      ['Other', 'Other IV Fluid*'],
    ]);
    expect(IV_FLUID_OTHER_VALUE).toBe('Other');
  });

  it('uses Android input limits and labels for the sub-inputs', () => {
    expect(INFUSION_INPUT_LIMITS).toEqual({
      oxytocinStrength: { kind: 'decimal', maxLength: 5, maxIntegerDigits: 2, maxFractionDigits: 2 },
      infusionRate: { kind: 'integer', maxDigits: 2 },
      otherType: { kind: 'text', maxLength: 20 },
    });
    expect(OTHER_TYPE_TEXT).toEqual({ characters: 'asciiLettersDigitsPunctuationSpace', capitalizeFirst: true });
    expect(Object.values(INFUSION_INPUT_LABELS).map((l) => l.androidLabel)).toEqual([
      'Strength (U/L)*',
      'IV Infusion Rate*\n(drops/minute)',
      'IV Infusion Status*',
      'Type of IV Fluid*',
    ]);
  });
});
