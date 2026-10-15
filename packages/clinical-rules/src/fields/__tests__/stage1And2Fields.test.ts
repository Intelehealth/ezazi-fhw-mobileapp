import { describe, it, expect } from 'vitest';
import { STAGE1_AND_2_FIELDS } from '../stage1And2Fields';
import { STAGE1_AND_2_SECTIONS } from '../sections';
import { getSectionFields } from '../cardFields';
import { BASE_RANGES } from '../../ranges/baseRanges';
import { INPUT_LIMITS } from '../../ranges/inputLimits';
import type { LimitedInputId } from '../../ranges/inputLimits';
import { getRangeFor } from '../../ranges/rangeProfiles';
import type { RangeId } from '../../ranges/types';
import type { FieldDefinition } from '../types';

const fields = STAGE1_AND_2_FIELDS as readonly FieldDefinition[];

/** Stored values per select field, copied from PartogramConstants.java `setValues` calls. */
const ANDROID_STORED_VALUES: Record<string, string[]> = {
  companion: ['Y', 'N', 'D'],
  painRelief: ['Y', 'N', 'D'],
  oralFluid: ['Y', 'N', 'D'],
  posture: ['SP', 'MO'],
  fhrDeceleration: ['N', 'E', 'L', 'V'],
  amnioticFluid: ['I', 'C', 'M+', 'M++', 'M+++', 'B'],
  fetalPosition: ['A', 'P', 'T'],
  caput: ['0', '+', '++', '+++'],
  moulding: ['0', '+', '++', '+++'],
  urineProtein: ['Negative', 'Trace', 'P1+', 'P2+', 'P3+', 'P4+'],
  urineAcetone: ['Negative', 'Trace', 'A1+', 'A2+', 'A3+', 'A4+'],
  cervix: ['10', '9', '8', '7', '6', '5'],
  descent: ['5', '4', '3', '2', '1', '0'],
};

describe('Stage 1/2 fields', () => {

  // ── Shape ────────────────────────────────────────────────────────────────

  it('has the 26 Android fields in the 6 Android sections, in display order', () => {
    expect(fields).toHaveLength(26);
    expect(STAGE1_AND_2_SECTIONS.map((s) => s.androidLabel)).toEqual([
      'Supportive care',
      'Baby',
      'Woman',
      'Labour Progress',
      'Medication Administration',
      'Shared Decision Making',
    ]);
    expect(STAGE1_AND_2_SECTIONS.map((s) => getSectionFields(s.id).length)).toEqual([4, 6, 6, 4, 3, 3]);
  });

  it('keeps Android order inside each section', () => {
    expect(getSectionFields('woman').map((f) => f.androidLabel)).toEqual([
      'Pulse',
      'Systolic BP',
      'Diastolic BP',
      'Temperature (°F)',
      'Urine protein',
      'Urine Acetone',
    ]);
  });

  it('lists every field grouped by section, never interleaved', () => {
    const order = fields.map((f) => STAGE1_AND_2_SECTIONS.findIndex((s) => s.id === f.section));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('uses unique ids, unique concept keys and unique label keys', () => {
    for (const key of ['id', 'conceptKey', 'labelKey'] as const) {
      expect(new Set(fields.map((f) => f[key])).size).toBe(fields.length);
    }
  });

  // ── Stored values (saving format) ────────────────────────────────────────

  it('stores exactly the option values Android stores', () => {
    const actual = Object.fromEntries(
      fields.filter((f) => f.input.kind === 'select').map((f) => [f.id, f.input.kind === 'select' ? f.input.options.map((o) => o.value) : []]),
    );
    expect(actual).toEqual(ANDROID_STORED_VALUES);
  });

  it('gives every option list unique values and unique label keys', () => {
    for (const field of fields) {
      const lists = [
        field.input.kind === 'select' ? field.input.options : [],
        ...Object.values(field.optionsByStage ?? {}),
      ];
      for (const options of lists) {
        expect(new Set(options.map((o) => o.value)).size).toBe(options.length);
        expect(new Set(options.map((o) => o.labelKey)).size).toBe(options.length);
      }
    }
  });

  it('saves medication and notes the Android way, everything else as one value', () => {
    const byStorage = (storage: string) => fields.filter((f) => f.storage === storage).map((f) => f.id);
    expect(byStorage('infusion')).toEqual(['oxytocin', 'ivFluids']);
    expect(byStorage('medicineList')).toEqual(['medicine']);
    expect(byStorage('noteList')).toEqual(['assessment', 'plan']);
    expect(byStorage('value')).toHaveLength(21);
  });

  // ── Inputs ───────────────────────────────────────────────────────────────

  it('matches Android input limits (InputFilter) for typed fields', () => {
    const limits = Object.fromEntries(
      fields
        .filter((f) => f.input.kind === 'integer' || f.input.kind === 'decimal')
        .map((f) => [f.id, f.input]),
    );
    expect(limits).toEqual({
      baselineFhr: { kind: 'integer', limits: { kind: 'integer', maxDigits: 3 } },
      pulse: { kind: 'integer', limits: { kind: 'integer', maxDigits: 3 } },
      systolicBp: { kind: 'integer', limits: { kind: 'integer', maxDigits: 3 } },
      diastolicBp: { kind: 'integer', limits: { kind: 'integer', maxDigits: 3 } },
      temperature: {
        kind: 'decimal',
        limits: { kind: 'decimal', maxLength: 5, maxIntegerDigits: 3, maxFractionDigits: 1 },
      },
      contractionsPer10Min: { kind: 'integer', limits: { kind: 'integer', maxDigits: 1 } },
      contractionDuration: { kind: 'integer', limits: { kind: 'integer', maxDigits: 3 } },
    });
  });

  it('takes its limits from the one central table, by reference', () => {
    for (const field of fields) {
      if (field.input.kind === 'integer' || field.input.kind === 'decimal') {
        expect(field.input.limits).toBe(INPUT_LIMITS[field.id as LimitedInputId]);
      }
    }
  });

  it('has a range for exactly the fields Android range-checks', () => {
    const ranged = fields.filter((f) => getRangeFor('default', f.id) !== null).map((f) => f.id);
    expect(ranged).toEqual(['baselineFhr', 'pulse', 'systolicBp', 'diastolicBp', 'temperature', 'contractionDuration']);
    for (const id of ranged) expect(getRangeFor('default', id)).toEqual(BASE_RANGES[id as RangeId]);
  });

  // ── Purity ───────────────────────────────────────────────────────────────

  it('holds no uuid anywhere (apps resolve conceptKey)', () => {
    expect(JSON.stringify(STAGE1_AND_2_FIELDS)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/i);
    expect(JSON.stringify(STAGE1_AND_2_FIELDS)).not.toMatch(/AAAAAAAAAAAA/);
  });

  it('cannot be changed at runtime', () => {
    expect(Object.isFrozen(STAGE1_AND_2_FIELDS[0])).toBe(true);
    expect(Object.isFrozen(STAGE1_AND_2_FIELDS[0].input)).toBe(true);
  });
});
