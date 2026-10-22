import { javaTrim } from '../internal/javaTrim';

/**
 * One Medicine obs value: Android `Medicine.toDBFormat()`, one obs per medicine:
 * `Form | Name | Strength | Dosage::Unit | Frequency | Route | Duration::Unit[ | Remark]`.
 * Read back like `Medicine.dbFormatToMedicineObject`; Java `trim()` semantics.
 */

export interface MedicineEntry {
  readonly form: string;
  readonly name: string;
  readonly strength: string;
  readonly dosage: string;
  readonly dosageUnit: string;
  readonly frequency: string;
  readonly route: string;
  readonly duration: string;
  readonly durationUnit: string;
  readonly remark?: string;
}

/** `Medicine.isValidMedicine`: the parts a medicine must have before it can be saved. */
export const MEDICINE_REQUIRED_FIELDS: readonly (keyof MedicineEntry)[] = Object.freeze([
  'name',
  'strength',
  'dosage',
  'dosageUnit',
  'form',
  'route',
]);

/** The text Android stores for one medicine. */
export function encodeMedicine(entry: MedicineEntry): string {
  const remark = entry.remark ? ` | ${entry.remark}` : '';
  return javaTrim(
    `${entry.form} | ${entry.name} | ${entry.strength} | ${entry.dosage}::${entry.dosageUnit} | ` +
      `${entry.frequency} | ${entry.route} | ${entry.duration}::${entry.durationUnit}${remark}`,
  );
}

function splitUnit(part: string): [string, string] {
  const [value = '', unit = ''] = javaTrim(part).split('::');
  return [value, unit];
}

/** Reads one stored medicine. Null when it has fewer than 7 parts (Android would crash). */
export function decodeMedicine(stored: string): MedicineEntry | null {
  const parts = stored.split('|');
  if (parts.length < 7) return null;

  const [dosage, dosageUnit] = splitUnit(parts[3]);
  const [duration, durationUnit] = splitUnit(parts[6]);
  const remark = parts.length > 7 ? javaTrim(parts[7]) : '';

  return {
    form: javaTrim(parts[0]),
    name: javaTrim(parts[1]),
    strength: javaTrim(parts[2]),
    dosage,
    dosageUnit,
    frequency: javaTrim(parts[4]),
    route: javaTrim(parts[5]),
    duration,
    durationUnit,
    ...(remark ? { remark } : {}),
  };
}
