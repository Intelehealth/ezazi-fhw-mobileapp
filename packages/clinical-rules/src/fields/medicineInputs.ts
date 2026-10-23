import { deepFreeze } from '../internal/deepFreeze';

/**
 * The Add Medicine form (`NewMedicineFragment`). Lists are Android's `res/values/arrays_ezazi.xml`
 * string arrays copied exactly, duplicates and spellings included (decided 2026-10-23, Kaveri).
 * Each value is both what the dropdown shows and what is stored; typing a value by hand is allowed.
 */

/** One `assets/medicines.json` entry (`GetMedicineData`, `Medicine`). */
export interface CatalogueMedicine {
  readonly name: string;
  readonly form: string;
  readonly strength: string;
  readonly dosageUnit: string;
  readonly route: string;
}

/** The medicine catalogue, in file order. Picking one fills name, form, strength, dose unit and route. */
export const MEDICINE_CATALOGUE: readonly CatalogueMedicine[] = deepFreeze([
  { name: 'Ampicillin', form: 'Capsule', strength: '500 mg', dosageUnit: 'Cap', route: 'Oral' },
  { name: 'Metronidazole', form: 'Tablet', strength: '400 mg', dosageUnit: 'Tab', route: 'Oral' },
  { name: 'Paracetamol', form: 'Tablet', strength: '650 mg', dosageUnit: 'Tab', route: 'Oral' },
  { name: 'Paracetamol', form: 'Tablet', strength: '500 mg', dosageUnit: 'Tab', route: 'Oral' },
  { name: 'Ibuprofen', form: 'Tablet', strength: '400 mg', dosageUnit: 'Tab', route: 'Oral' },
  { name: 'B Complex', form: 'Tablet', strength: '-', dosageUnit: 'Tab', route: 'Oral' },
  { name: 'Misoprostol', form: 'Tablet', strength: '200 ug', dosageUnit: 'Tab', route: 'Oral' },
  { name: 'Gentamycin', form: 'Injection', strength: '10 mg/mL', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Gentamycin', form: 'Injection', strength: '40 mg/mL', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Betamethasone', form: 'Injection', strength: '4 mg/mL', dosageUnit: 'mL', route: 'Intramuscular (IM)' },
  { name: 'Hydralazine', form: 'Injection', strength: '20 mg/mL', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Nifedipine', form: 'Capsule', strength: '10 mg', dosageUnit: 'Cap', route: 'Oral' },
  { name: 'Methyldopa', form: 'Tablet', strength: '250 mg', dosageUnit: 'Tab', route: 'Oral' },
  { name: 'Methyldopa', form: 'Tablet', strength: '500 mg', dosageUnit: 'Tab', route: 'Oral' },
  { name: 'Labetalol', form: 'Injection', strength: '5 mg/mL', dosageUnit: 'mL', route: 'IV Infusion' },
  { name: 'Magnesium Sulfate 20%', form: 'Injection', strength: '500 mg/mL', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Magnesium Sulfate 50%', form: 'Injection', strength: '500 mg/mL', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Metronidazole', form: 'Injection', strength: '500 mg/100 mL', dosageUnit: 'mL', route: 'IV Infusion' },
  { name: 'Calcium Gluconate', form: 'Injection', strength: '100 mg/mL', dosageUnit: 'mL', route: 'IV Infusion' },
  { name: 'Dexamethasone', form: 'Injection', strength: '4 mg/mL', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Ampicillin', form: 'Injection', strength: '500 mg', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Ampicillin', form: 'Injection', strength: '1000 mg', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Lignocaine', form: 'Injection', strength: '2%', dosageUnit: 'mL', route: 'Local infiltration' },
  { name: 'Adrenaline', form: 'Injection', strength: '1 mg/mL', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Hydrocortisone Succinate', form: 'Injection', strength: '100 mg', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Hydrocortisone Succinate', form: 'Injection', strength: '200 mg', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Diazepam', form: 'Injection', strength: '5 mg/mL', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Pheniramine Maleate', form: 'Injection', strength: '22.75 mg/mL', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Carboprost', form: 'Injection', strength: '125 ug', dosageUnit: 'mL', route: 'Intramuscular (IM)' },
  { name: 'Pentazocin Chloride', form: 'Injection', strength: '30 mg/mL', dosageUnit: 'mL', route: 'Intramuscular (IM)' },
  { name: 'Promethazine', form: 'Injection', strength: '25 mg/mL', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Oxytocin', form: 'Injection', strength: '5 IU/mL', dosageUnit: 'mL', route: 'IV Infusion' },
  { name: 'Oxytocin', form: 'Injection', strength: '10 IU/mL', dosageUnit: 'mL', route: 'IV Infusion' },
  { name: 'Ringer Lactate', form: 'IV Fluid', strength: '-', dosageUnit: 'mL', route: 'IV Infusion' },
  { name: 'Normal Saline', form: 'IV Fluid', strength: '0.9%', dosageUnit: 'mL', route: 'IV Infusion' },
  { name: 'Dextrose (D5)', form: 'IV Fluid', strength: '5%', dosageUnit: 'mL', route: 'IV Infusion' },
  { name: 'Ceftriaxone', form: 'Injection', strength: '500 mg', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Ceftriaxone', form: 'Injection', strength: '1000 mg', dosageUnit: 'mL', route: 'Intravenous (IV)' },
  { name: 'Ceftriaxone', form: 'Injection', strength: '2000 mg', dosageUnit: 'mL', route: 'Intravenous (IV)' },
]);

/** What the name dropdown shows for a catalogue entry (Android `medicineFullName`). */
export function catalogueLabel(medicine: CatalogueMedicine): string {
  return `${medicine.form} ${medicine.name} ${medicine.strength}`;
}

/** The entry a picked dropdown text names, ignoring case; the last match wins, as Android. Null when typed by hand. */
export function findCatalogueMedicine(label: string): CatalogueMedicine | null {
  const wanted = label.toUpperCase();
  return [...MEDICINE_CATALOGUE].reverse().find((medicine) => catalogueLabel(medicine).toUpperCase() === wanted) ?? null;
}

/** Type / form (`R.array.medicine_form`). */
export const MEDICINE_FORM_OPTIONS: readonly string[] = deepFreeze([
  'Capsule',
  'Tablet',
  'Injection',
  'IV Fluid',
  'Liquid',
  'Drop',
  'Inhaler',
  'Suppositorie',
  'Topical',
  'Implant',
  'Patche',
]);

/** Strength (`R.array.medicine_strength`). */
export const MEDICINE_STRENGTH_OPTIONS: readonly string[] = deepFreeze([
  '5 mg',
  '10 mg',
  '50 mg',
  '75 mg',
  '100 mg',
  '500 mg',
  '1000 mg',
  '100 mg',
  '150 mg',
  '200 mg',
  '250 mg',
  '750 mg',
  '-',
  '2000 mg',
  '5%',
  '0.9%',
  '10 IU/mL',
  '5 IU/mL',
  '25 mg/mL',
  '30 mg/mL',
  '125 ug',
  '5 mg/mL',
  '1 mg/mL',
  '2%',
  '4 mg/mL',
  '100 mg/mL',
  '500  mg/mL',
  '500 mg/100 mL mg/mL',
  '20 mg/mL',
  '40 mg/mL',
  '10 mg/mL',
  '200 ug',
  '400  mg',
  '650  mg',
]);

/** Dose unit (`R.array.dose_units`). */
export const MEDICINE_DOSE_UNIT_OPTIONS: readonly string[] = deepFreeze([
  'mL',
  'mg',
  'ug',
  '%',
  'IU',
  'Tab',
  'Cap',
  'Drop',
]);

/** Route (`R.array.medicine_routes`). */
export const MEDICINE_ROUTE_OPTIONS: readonly string[] = deepFreeze([
  'Oral',
  'Sublingual (SL)',
  'Intravenous (IV)',
  'IV Infusion',
  'Intramuscular (IM)',
  'Subcutaneous (SC)',
  'Intradermal (ID)',
]);

/** Frequency (`R.array.medicine_frequencies`). */
export const MEDICINE_FREQUENCY_OPTIONS: readonly string[] = deepFreeze([
  'Once daily (OD)',
  'Twice daily (BD)',
  'Thrice daily (TID)',
  'Four times in a day (QID)',
  'Single Dose, Stat Dose',
  'Single Dose, Stat Dose',
  'As required (SOS)',
]);

/** Duration unit (`R.array.medicine_duration_units`). */
export const MEDICINE_DURATION_UNIT_OPTIONS: readonly string[] = deepFreeze([
  'Minute',
  'Minutes',
  'Hour',
  'Hours',
  'Day',
  'Days',
]);
