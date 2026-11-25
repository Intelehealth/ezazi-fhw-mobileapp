import { describe, expect, it } from 'vitest';
import {
  emptyIvFluidRow,
  emptyMedicationRow,
  emptyNoteRow,
  emptyOxytocinRow,
  type MedicationRow,
} from '../../../../../modules/dashboard/elcg/decisions/decision.rows';
import {
  ivFluidFormSchema,
  medicationFormSchema,
  noteFormSchema,
  oxytocinFormSchema,
} from '../../../../../modules/dashboard/elcg/decisions/decision.validation';

/** Each failing field and its message, for one row. */
function issues(
  schema: {
    safeParse: (value: unknown) => {
      success: boolean;
      error?: { issues: { path: (string | number)[]; message: string }[] };
    };
  },
  row: object
): Record<string, string> {
  const result = schema.safeParse({ rows: [row] });
  return Object.fromEntries(
    (result.error?.issues ?? []).map(issue => [
      String(issue.path[issue.path.length - 1]),
      issue.message,
    ])
  );
}

describe('noteFormSchema', () => {
  const schema = noteFormSchema('Enter plan');

  it('requires text other than spaces', () => {
    expect(issues(schema, { ...emptyNoteRow(), value: '   ' })).toEqual({
      value: 'Enter plan',
    });
    expect(issues(schema, { ...emptyNoteRow(), value: 'Rest' })).toEqual({});
  });

  it('does not check a row that was removed', () => {
    expect(
      issues(schema, { ...emptyNoteRow(), obsUuid: 'obs-1', isDeleted: true })
    ).toEqual({});
  });
});

describe('oxytocinFormSchema', () => {
  const valid = {
    ...emptyOxytocinRow(),
    strength: '5',
    infusionRate: '20',
    infusionStatus: 'Start',
  };

  it('accepts a full order in range', () => {
    expect(issues(oxytocinFormSchema, valid)).toEqual({});
  });

  it('requires every field', () => {
    expect(issues(oxytocinFormSchema, emptyOxytocinRow())).toEqual({
      strength: 'Enter strength',
      infusionRate: 'Enter infusion rate',
      infusionStatus: 'Select infusion status',
    });
  });

  it.each([
    ['0', '20'],
    ['11', '20'],
    ['abc', '20'],
  ])('holds the strength to 1–10 (%s)', (strength, infusionRate) => {
    expect(
      issues(oxytocinFormSchema, { ...valid, strength, infusionRate })
    ).toEqual({ strength: 'Strength should be between 1 to 10' });
  });

  it.each(['4', '61'])('holds the rate to 5–60 (%s)', infusionRate => {
    expect(issues(oxytocinFormSchema, { ...valid, infusionRate })).toEqual({
      infusionRate: 'Infusion rate should be between 5 to 60',
    });
  });
});

describe('ivFluidFormSchema', () => {
  const valid = {
    ...emptyIvFluidRow(),
    type: 'Normal Saline',
    infusionRate: '30',
    infusionStatus: 'Continue',
  };

  it('accepts a full order, with no other type unless the type is "Other"', () => {
    expect(issues(ivFluidFormSchema, valid)).toEqual({});
  });

  it('requires every field', () => {
    expect(issues(ivFluidFormSchema, emptyIvFluidRow())).toEqual({
      type: 'Enter type',
      infusionRate: 'Enter infusion rate',
      infusionStatus: 'Select infusion status',
    });
  });

  it('asks for the other type, up to 15 characters', () => {
    const other = { ...valid, type: 'Other' };
    expect(issues(ivFluidFormSchema, other)).toEqual({
      otherType: 'Enter other type',
    });
    expect(
      issues(ivFluidFormSchema, { ...other, otherType: 'A'.repeat(16) })
    ).toEqual({ otherType: 'Other type should be less than 15 characters' });
    expect(
      issues(ivFluidFormSchema, { ...other, otherType: 'Mannitol' })
    ).toEqual({});
  });

  it('holds the rate to 5–60', () => {
    expect(issues(ivFluidFormSchema, { ...valid, infusionRate: '70' })).toEqual(
      { infusionRate: 'Infusion rate should be between 5 to 60' }
    );
  });
});

describe('medicationFormSchema', () => {
  const valid: MedicationRow = {
    ...emptyMedicationRow(),
    typeOfMedicine: 'Tablet',
    medicineName: 'Paracetamol',
    strength: '650 mg',
    dosage: '1',
    dosageUnit: 'Tab',
    frequency: 'Thrice daily (TID)',
    routeOfMedicine: 'Oral',
    duration: '3',
    durationUnit: 'Days',
  };

  it('accepts a full prescription, the remark being optional', () => {
    expect(issues(medicationFormSchema, valid)).toEqual({});
  });

  it('caps each field at its length', () => {
    expect(
      issues(medicationFormSchema, {
        ...valid,
        medicineName: 'M'.repeat(101),
        typeOfMedicine: 'F'.repeat(16),
        strength: 'S'.repeat(16),
        dosage: '1'.repeat(11),
        dosageUnit: 'U'.repeat(11),
        frequency: 'Q'.repeat(26),
        routeOfMedicine: 'R'.repeat(26),
        duration: '2'.repeat(16),
        durationUnit: 'D'.repeat(16),
        remark: 'K'.repeat(16),
      })
    ).toEqual({
      medicineName: 'Medicine name should be less than 100 characters',
      typeOfMedicine: 'Type should be less than 15 characters',
      strength: 'Strength should be less than 15 characters',
      dosage: 'Dosage should be less than 10 characters',
      dosageUnit: 'Dosage unit should be less than 10 characters',
      frequency: 'Frequency should be less than 25 characters',
      routeOfMedicine: 'Route should be less than 25 characters',
      duration: 'Duration should be less than 15 characters',
      durationUnit: 'Duration unit should be less than 15 characters',
      remark: 'Remark should be less than 15 characters',
    });
  });

  it('rejects a negative or non-numeric dosage and duration', () => {
    expect(
      issues(medicationFormSchema, { ...valid, dosage: '-1', duration: 'x' })
    ).toEqual({
      dosage: 'Dosage cannot be negative',
      duration: 'Duration cannot be negative',
    });
  });
});
