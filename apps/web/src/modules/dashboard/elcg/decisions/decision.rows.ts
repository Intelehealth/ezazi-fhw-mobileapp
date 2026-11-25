import type {
  LcgIvFluidEntry,
  LcgNoteEntry,
  LcgOxytocinEntry,
} from '../elcg.types';
import { formatDayMonthYearTime12h } from '../../../../utils/date-format';
import { OTHER_IV_FLUID_TYPE } from './decision.catalog';

/**
 * One row of a Shared Decision Making dialog's form. `obsUuid` is the obs
 * it edits (null for a new one); removing a saved row only flags it, so Save
 * can void the obs — the Angular forms' `id` / `isDeleted` controls.
 */
export interface DecisionRowBase {
  obsUuid: string | null;
  isDeleted: boolean;
}

export interface NoteRow extends DecisionRowBase {
  value: string;
}

export interface OxytocinRow extends DecisionRowBase {
  strength: string;
  infusionRate: string;
  infusionStatus: string;
}

export interface IvFluidRow extends DecisionRowBase {
  type: string;
  otherType: string;
  infusionRate: string;
  infusionStatus: string;
}

export interface MedicationRow extends DecisionRowBase {
  medicineName: string;
  typeOfMedicine: string;
  strength: string;
  dosage: string;
  dosageUnit: string;
  frequency: string;
  routeOfMedicine: string;
  duration: string;
  durationUnit: string;
  remark: string;
}

/** What Save does to OpenMRS, one obs at a time. */
export type ObsChange =
  | { action: 'create'; value: string }
  | { action: 'update'; uuid: string; value: string }
  | { action: 'delete'; uuid: string };

/** A structured value's field as form text (JSON may hold it as a number). */
function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/* ---------------------------------------------------------------- notes */

export function emptyNoteRow(): NoteRow {
  return { obsUuid: null, isDeleted: false, value: '' };
}

export function noteRow(entry: LcgNoteEntry): NoteRow {
  return { obsUuid: entry.uuid, isDeleted: false, value: entry.value };
}

export function serializeNote(row: NoteRow): string {
  return row.value.trim();
}

/* ------------------------------------------------------------- oxytocin */

export function emptyOxytocinRow(): OxytocinRow {
  return {
    obsUuid: null,
    isDeleted: false,
    strength: '',
    infusionRate: '',
    infusionStatus: '',
  };
}

export function oxytocinRow(entry: LcgOxytocinEntry): OxytocinRow {
  const value = typeof entry.value === 'string' ? null : entry.value;
  return {
    obsUuid: entry.uuid,
    isDeleted: false,
    strength: text(value?.strength),
    infusionRate: text(value?.infusionRate),
    infusionStatus: text(value?.infusionStatus),
  };
}

/** The JSON prescribeOxytocin() stores — numbers, as its number inputs give them. */
export function serializeOxytocin(row: OxytocinRow): string {
  return JSON.stringify({
    strength: Number(row.strength),
    infusionRate: Number(row.infusionRate),
    infusionStatus: row.infusionStatus,
  });
}

/** `START OXYTOCIN - 5 U/L (10 drops/minute)`, or a plain-text value as is. */
export function oxytocinLabel(entry: LcgOxytocinEntry): string {
  if (typeof entry.value === 'string') return entry.value;
  const { infusionStatus, strength, infusionRate } = entry.value;
  return `${text(infusionStatus).toUpperCase()} OXYTOCIN - ${text(strength)} U/L (${text(infusionRate)} drops/minute)`;
}

/* ------------------------------------------------------------ IV fluids */

export function emptyIvFluidRow(): IvFluidRow {
  return {
    obsUuid: null,
    isDeleted: false,
    type: '',
    otherType: '',
    infusionRate: '',
    infusionStatus: '',
  };
}

export function ivFluidRow(entry: LcgIvFluidEntry): IvFluidRow {
  const value = typeof entry.value === 'string' ? null : entry.value;
  return {
    obsUuid: entry.uuid,
    isDeleted: false,
    type: text(value?.type),
    otherType: text(value?.otherType),
    infusionRate: text(value?.infusionRate),
    infusionStatus: text(value?.infusionStatus),
  };
}

/** The JSON prescribeIvFluid() stores; `otherType` is null unless the type is "Other". */
export function serializeIvFluid(row: IvFluidRow): string {
  return JSON.stringify({
    type: row.type,
    otherType:
      row.type === OTHER_IV_FLUID_TYPE ? row.otherType.trim() || null : null,
    infusionRate: Number(row.infusionRate),
    infusionStatus: row.infusionStatus,
  });
}

/** `CONTINUE IV - Other Dextrose 5% (20 drops/minute)`, or a plain-text value as is. */
export function ivFluidLabel(entry: LcgIvFluidEntry): string {
  if (typeof entry.value === 'string') return entry.value;
  const { infusionStatus, type, otherType, infusionRate } = entry.value;
  const fluid = otherType ? `${text(type)} ${text(otherType)}` : text(type);
  return `${text(infusionStatus).toUpperCase()} IV - ${fluid} (${text(infusionRate)} drops/minute)`;
}

/* ----------------------------------------------------------- medication */

export function emptyMedicationRow(): MedicationRow {
  return {
    obsUuid: null,
    isDeleted: false,
    medicineName: '',
    typeOfMedicine: '',
    strength: '',
    dosage: '',
    dosageUnit: '',
    frequency: '',
    routeOfMedicine: '',
    duration: '',
    durationUnit: '',
    remark: '',
  };
}

/** `amount::unit` → [amount, unit]; anything without the separator has neither. */
function splitAmount(part: string | undefined): [string, string] {
  if (!part?.includes('::')) return ['', ''];
  /* Holds the separator, so there is always an amount and a unit (maybe empty). */
  const [amount, unit] = part.split('::');
  return [amount, unit];
}

/**
 * Reads a Medicine Prescribed value —
 * `Form | Name | Strength | dosage::unit | Frequency | Route | duration::unit[ | Remark]`.
 */
export function parseMedicine(
  value: string
): Omit<MedicationRow, 'obsUuid' | 'isDeleted'> {
  const parts = value.split('|').map(part => part.trim());
  const [dosage, dosageUnit] = splitAmount(parts[3]);
  const [duration, durationUnit] = splitAmount(parts[6]);
  return {
    /* split() always yields a first part. */
    typeOfMedicine: parts[0],
    medicineName: parts[1] ?? '',
    strength: parts[2] ?? '',
    dosage,
    dosageUnit,
    frequency: parts[4] ?? '',
    routeOfMedicine: parts[5] ?? '',
    duration,
    durationUnit,
    remark: parts.length === 8 ? parts[7] : '',
  };
}

export function medicationRow(entry: LcgNoteEntry): MedicationRow {
  return {
    obsUuid: entry.uuid,
    isDeleted: false,
    ...parseMedicine(entry.value),
  };
}

/** The pipe-separated text prescribeMedication() stores. */
export function serializeMedication(row: MedicationRow): string {
  const remark = row.remark.trim();
  return [
    row.typeOfMedicine,
    row.medicineName.trim(),
    row.strength.trim(),
    `${row.dosage}::${row.dosageUnit}`,
    row.frequency,
    row.routeOfMedicine,
    `${row.duration}::${row.durationUnit}`,
    ...(remark ? [remark] : []),
  ].join(' | ');
}

/** prescribe-medication's history line: `Tablet Paracetamol 650 mg 1 Tab … for 3 Days`. */
export function medicationLabel(value: string): string {
  const m = parseMedicine(value);
  return [
    m.typeOfMedicine,
    m.medicineName,
    m.strength,
    m.dosage,
    m.dosageUnit,
    m.frequency,
    m.routeOfMedicine,
    'for',
    m.duration,
    m.durationUnit,
    m.remark,
  ]
    .filter(Boolean)
    .join(' ');
}

/* -------------------------------------------------------------- changes */

/**
 * What Save sends — the Angular handlers' loop over the form's rows: a saved
 * row flagged deleted is voided, a new row is created, and a saved row is
 * updated (only when its value actually changed).
 */
export function planObsChanges<TRow extends DecisionRowBase>(
  rows: TRow[],
  initialRows: TRow[],
  serialize: (row: TRow) => string
): ObsChange[] {
  const initialValues = new Map(
    initialRows.map(row => [row.obsUuid, serialize(row)])
  );
  const changes: ObsChange[] = [];
  for (const row of rows) {
    if (row.obsUuid) {
      if (row.isDeleted) {
        changes.push({ action: 'delete', uuid: row.obsUuid });
        continue;
      }
      const value = serialize(row);
      if (value !== initialValues.get(row.obsUuid)) {
        changes.push({ action: 'update', uuid: row.obsUuid, value });
      }
    } else if (!row.isDeleted) {
      changes.push({ action: 'create', value: serialize(row) });
    }
  }
  return changes;
}

/**
 * A dialog history line's "who and when" — `Dr. Joshi (02-11-2026 07:05 PM)`
 * (prescribe-*'s `{{initial}} ({{obsDatetime|date}})`), or just the time in
 * brackets, as add-assessment / prescribe-plan list it.
 */
export function recordedBy(
  entry: { initial: string; obsDatetime: string },
  withInitial = true
): string {
  const when = `(${formatDayMonthYearTime12h(entry.obsDatetime) ?? ''})`;
  return withInitial ? `${entry.initial} ${when}` : when;
}
