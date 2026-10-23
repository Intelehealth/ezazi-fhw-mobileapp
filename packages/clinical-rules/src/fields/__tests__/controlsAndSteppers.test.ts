import { describe, expect, it } from 'vitest';

import { getAlertCode } from '../../alerts/alertCode';
import { FIELD_ID, INFUSION_INPUT_ID } from '../../constants';
import type { StepperId } from '../../ranges/types';
import { FIELD_CONTROLS, getFieldControl } from '../fieldControls';
import { STAGE1_AND_2_FIELDS } from '../stage1And2Fields';
import { getStepperSpec } from '../stepper';

// Expected values written out from Android's numbers (validation ranges, InputFilters,
// PartogramAlertEngine thresholds) plus the agreed steps, independent of the package code.
const EXPECTED: Record<StepperId, { min: number; max: number; base: number; step: number; fractionDigits: number }> = {
  [FIELD_ID.BASELINE_FHR]: { min: 90, max: 220, base: 110, step: 1, fractionDigits: 0 },
  [FIELD_ID.PULSE]: { min: 30, max: 250, base: 60, step: 1, fractionDigits: 0 },
  [FIELD_ID.SYSTOLIC_BP]: { min: 30, max: 300, base: 80, step: 1, fractionDigits: 0 },
  [FIELD_ID.DIASTOLIC_BP]: { min: 20, max: 180, base: 20, step: 1, fractionDigits: 0 },
  [FIELD_ID.TEMPERATURE]: { min: 89.6, max: 109, base: 95, step: 0.1, fractionDigits: 1 },
  [FIELD_ID.CONTRACTIONS_PER_10MIN]: { min: 0, max: 9, base: 3, step: 1, fractionDigits: 0 },
  [FIELD_ID.CONTRACTION_DURATION]: { min: 0, max: 100, base: 20, step: 1, fractionDigits: 0 },
  [INFUSION_INPUT_ID.STRENGTH]: { min: 1, max: 10, base: 1, step: 1, fractionDigits: 2 },
  [INFUSION_INPUT_ID.INFUSION_RATE]: { min: 5, max: 60, base: 5, step: 5, fractionDigits: 0 },
};

describe('getStepperSpec', () => {
  it('derives every stepper from Android data: range, keystroke limit, first non-alert value', () => {
    for (const [id, spec] of Object.entries(EXPECTED)) {
      expect([id, getStepperSpec(id as StepperId, 'default')]).toEqual([id, spec]);
    }
  });

  it('never starts on an alert value, and always inside the range', () => {
    for (const id of Object.keys(EXPECTED) as StepperId[]) {
      const { min, max, base } = getStepperSpec(id, 'default');
      expect(base).toBeGreaterThanOrEqual(min);
      expect(base).toBeLessThanOrEqual(max);
      if (id !== INFUSION_INPUT_ID.STRENGTH && id !== INFUSION_INPUT_ID.INFUSION_RATE) {
        expect([id, getAlertCode(id, String(base))]).toEqual([id, 'G']);
      }
    }
  });

  it('gives every client profile the same steppers today (no overrides yet)', () => {
    for (const id of Object.keys(EXPECTED) as StepperId[]) {
      expect(getStepperSpec(id, 'nepal')).toEqual(getStepperSpec(id, 'default'));
    }
  });
});

describe('field controls', () => {
  it('gives every field exactly one control', () => {
    expect(Object.keys(FIELD_CONTROLS).sort()).toEqual(STAGE1_AND_2_FIELDS.map((f) => f.id).sort());
  });

  it('matches each control to what the field holds', () => {
    for (const field of STAGE1_AND_2_FIELDS) {
      const control = getFieldControl(field.id);
      const { input } = field;
      if (control === 'segmented') expect(input.kind === 'select' && input.options.length <= 4).toBe(true);
      if (control === 'picker') expect(input.kind === 'select' && input.options.length >= 5).toBe(true);
      if (control === 'chips') {
        expect(input.kind === 'select' && input.options.every((o) => /^\d+$/.test(o.value))).toBe(true);
      }
      if (control === 'stepper') expect(['integer', 'decimal']).toContain(input.kind);
      if (input.kind === 'infusion') expect(control).toBe('infusion');
      if (input.kind === 'medicineList' || input.kind === 'noteList' || input.kind === 'text') {
        expect(control).toBe(input.kind);
      }
    }
  });

  it('uses the Figma choices for the fields the design shows', () => {
    expect(getFieldControl(FIELD_ID.CERVIX)).toBe('chips');
    expect(getFieldControl(FIELD_ID.AMNIOTIC_FLUID)).toBe('picker');
    expect(getFieldControl(FIELD_ID.URINE_PROTEIN)).toBe('picker');
    expect(getFieldControl(FIELD_ID.BASELINE_FHR)).toBe('stepper');
    expect(getFieldControl(FIELD_ID.COMPANION)).toBe('segmented');
  });
});
