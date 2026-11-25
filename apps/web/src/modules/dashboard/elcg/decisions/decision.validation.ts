import { z } from 'zod';
import { OTHER_IV_FLUID_TYPE } from './decision.catalog';
import type {
  IvFluidRow,
  MedicationRow,
  NoteRow,
  OxytocinRow,
} from './decision.rows';

/**
 * The Shared Decision Making dialogs' validators, with the Angular forms'
 * messages. A row the user removed is not checked — it is only voided.
 */

type Issue<TRow> = (field: keyof TRow & string, message: string) => void;

const base = {
  obsUuid: z.string().nullable(),
  isDeleted: z.boolean(),
};

function rowsSchema<TRow extends { isDeleted: boolean }>(
  fields: Record<Exclude<keyof TRow, 'obsUuid' | 'isDeleted'>, z.ZodString>,
  check: (row: TRow, issue: Issue<TRow>) => void
) {
  const row = z.object({ ...base, ...fields }).superRefine((value, ctx) => {
    const typed = value as unknown as TRow;
    if (typed.isDeleted) return;
    check(typed, (field, message) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message })
    );
  });
  return z.object({ rows: z.array(row) });
}

const isBlank = (value: string) => value.trim() === '';

/**
 * A number between `min` and `max`, as the number inputs' Validators.min/max
 * read it. Returns the message to show, or null.
 */
function rangeError(
  value: string,
  min: number,
  max: number,
  message: string
): string | null {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max
    ? null
    : message;
}

/** Validators.min(0) on a number input: a non-number or a negative amount fails. */
function negative(value: string): boolean {
  const number = Number(value);
  return !Number.isFinite(number) || number < 0;
}

/** add-assessment / prescribe-plan: each row's text is required. */
export function noteFormSchema(requiredMessage: string) {
  return rowsSchema<NoteRow>({ value: z.string() }, (row, issue) => {
    if (isBlank(row.value)) issue('value', requiredMessage);
  });
}

export const oxytocinFormSchema = rowsSchema<OxytocinRow>(
  {
    strength: z.string(),
    infusionRate: z.string(),
    infusionStatus: z.string(),
  },
  (row, issue) => {
    if (isBlank(row.strength)) issue('strength', 'Enter strength');
    else {
      const error = rangeError(
        row.strength,
        1,
        10,
        'Strength should be between 1 to 10'
      );
      if (error) issue('strength', error);
    }
    if (isBlank(row.infusionRate)) issue('infusionRate', 'Enter infusion rate');
    else {
      const error = rangeError(
        row.infusionRate,
        5,
        60,
        'Infusion rate should be between 5 to 60'
      );
      if (error) issue('infusionRate', error);
    }
    if (isBlank(row.infusionStatus)) {
      issue('infusionStatus', 'Select infusion status');
    }
  }
);

export const ivFluidFormSchema = rowsSchema<IvFluidRow>(
  {
    type: z.string(),
    otherType: z.string(),
    infusionRate: z.string(),
    infusionStatus: z.string(),
  },
  (row, issue) => {
    if (isBlank(row.type)) issue('type', 'Enter type');
    if (row.type === OTHER_IV_FLUID_TYPE) {
      if (isBlank(row.otherType)) issue('otherType', 'Enter other type');
      else if (row.otherType.trim().length > 15) {
        issue('otherType', 'Other type should be less than 15 characters');
      }
    }
    if (isBlank(row.infusionRate)) issue('infusionRate', 'Enter infusion rate');
    else {
      const error = rangeError(
        row.infusionRate,
        5,
        60,
        'Infusion rate should be between 5 to 60'
      );
      if (error) issue('infusionRate', error);
    }
    if (isBlank(row.infusionStatus)) {
      issue('infusionStatus', 'Select infusion status');
    }
  }
);

export const medicationFormSchema = rowsSchema<MedicationRow>(
  {
    medicineName: z.string(),
    typeOfMedicine: z.string(),
    strength: z.string(),
    dosage: z.string(),
    dosageUnit: z.string(),
    frequency: z.string(),
    routeOfMedicine: z.string(),
    duration: z.string(),
    durationUnit: z.string(),
    remark: z.string(),
  },
  (row, issue) => {
    const required = (
      field: keyof MedicationRow & string,
      requiredMessage: string,
      maxLength: number,
      lengthMessage: string
    ) => {
      const value = String(row[field]).trim();
      if (!value) issue(field, requiredMessage);
      else if (value.length > maxLength) issue(field, lengthMessage);
    };

    required(
      'medicineName',
      'Enter medicine name',
      100,
      'Medicine name should be less than 100 characters'
    );
    required(
      'typeOfMedicine',
      'Enter type',
      15,
      'Type should be less than 15 characters'
    );
    required(
      'strength',
      'Enter strength',
      15,
      'Strength should be less than 15 characters'
    );
    required(
      'dosage',
      'Enter dosage',
      10,
      'Dosage should be less than 10 characters'
    );
    if (!isBlank(row.dosage) && negative(row.dosage)) {
      issue('dosage', 'Dosage cannot be negative');
    }
    required(
      'dosageUnit',
      'Enter dosage unit',
      10,
      'Dosage unit should be less than 10 characters'
    );
    required(
      'frequency',
      'Select frequency',
      25,
      'Frequency should be less than 25 characters'
    );
    required(
      'routeOfMedicine',
      'Select route',
      25,
      'Route should be less than 25 characters'
    );
    required(
      'duration',
      'Enter duration',
      15,
      'Duration should be less than 15 characters'
    );
    if (!isBlank(row.duration) && negative(row.duration)) {
      issue('duration', 'Duration cannot be negative');
    }
    required(
      'durationUnit',
      'Select duration unit',
      15,
      'Duration unit should be less than 15 characters'
    );
    if (row.remark.trim().length > 15) {
      issue('remark', 'Remark should be less than 15 characters');
    }
  }
);

export type NoteFormValues = { rows: NoteRow[] };
export type OxytocinFormValues = { rows: OxytocinRow[] };
export type IvFluidFormValues = { rows: IvFluidRow[] };
export type MedicationFormValues = { rows: MedicationRow[] };
