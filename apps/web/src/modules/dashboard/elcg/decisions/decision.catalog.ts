import type { LcgDecisionKind } from '../elcg.types';

/**
 * The concept each Shared Decision Making dialog records — partogram.
 * component.ts's conceptAssessment / conceptPlan / conceptMedicinePrescribed /
 * conceptOxytocinPrescribed / conceptIvFluidsPrescribed.
 */
export const DECISION_CONCEPTS: Record<LcgDecisionKind, string> = {
  assessment: '67a050c1-35e5-451c-a4ab-fff9d57b0db1',
  plan: '162169AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  medication: 'ce75ed49-0eac-44f0-ac91-bcf9c5d1d700',
  oxytocin: '6eef8ae6-e6b3-46f1-a58c-393bd6d0e8c8',
  ivFluids: '0c21f925-d225-48ce-9e98-bb1cc5638e04',
};

/** prescribe-oxytocin / prescribe-iv-fluid's infusionStatusList. */
export const INFUSION_STATUSES = ['Start', 'Continue', 'Stop'];

/** prescribe-iv-fluid's typeList. */
export const IV_FLUID_TYPES = [
  'Ringer Lactate',
  'Normal Saline',
  'Dextrose 5% (D5)',
  'Other',
];

/** The IV fluid type that asks for its own name. */
export const OTHER_IV_FLUID_TYPE = 'Other';

/** One preset of prescribe-medication's `medicines` list. */
export interface MedicinePreset {
  id: number;
  name: string;
  form: string;
  strength: string;
  doseUnit: string;
  route: string;
}

/** prescribe-medication.component.ts's `medicines`, in its order. */
export const MEDICINE_PRESETS: MedicinePreset[] = [
  {
    id: 1,
    name: 'Ampicillin',
    form: 'Capsule',
    strength: '500 mg',
    doseUnit: 'Cap',
    route: 'Oral',
  },
  {
    id: 2,
    name: 'Metronidazole',
    form: 'Tablet',
    strength: '400 mg',
    doseUnit: 'Tab',
    route: 'Oral',
  },
  {
    id: 3,
    name: 'Paracetamol',
    form: 'Tablet',
    strength: '650 mg',
    doseUnit: 'Tab',
    route: 'Oral',
  },
  {
    id: 4,
    name: 'Paracetamol',
    form: 'Tablet',
    strength: '500 mg',
    doseUnit: 'Tab',
    route: 'Oral',
  },
  {
    id: 5,
    name: 'Ibuprofen',
    form: 'Tablet',
    strength: '400 mg',
    doseUnit: 'Tab',
    route: 'Oral',
  },
  {
    id: 6,
    name: 'B Complex',
    form: 'Tablet',
    strength: '-',
    doseUnit: 'Tab',
    route: 'Oral',
  },
  {
    id: 7,
    name: 'Misoprostol',
    form: 'Tablet',
    strength: '200 ug',
    doseUnit: 'Tab',
    route: 'Oral',
  },
  {
    id: 8,
    name: 'Gentamycin',
    form: 'Injection',
    strength: '10 mg/mL',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 9,
    name: 'Gentamycin',
    form: 'Injection',
    strength: '40 mg/mL',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 10,
    name: 'Betamethasone',
    form: 'Injection',
    strength: '4 mg/mL',
    doseUnit: 'mL',
    route: 'Intramuscular (IM)',
  },
  {
    id: 11,
    name: 'Hydralazine',
    form: 'Injection',
    strength: '20 mg/mL',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 12,
    name: 'Nifedipine',
    form: 'Capsule',
    strength: '10 mg',
    doseUnit: 'Cap',
    route: 'Oral',
  },
  {
    id: 13,
    name: 'Methyldopa',
    form: 'Tablet',
    strength: '250 mg',
    doseUnit: 'Tab',
    route: 'Oral',
  },
  {
    id: 14,
    name: 'Methyldopa',
    form: 'Tablet',
    strength: '500 mg',
    doseUnit: 'Tab',
    route: 'Oral',
  },
  {
    id: 15,
    name: 'Labetalol',
    form: 'Injection',
    strength: '5 mg/mL',
    doseUnit: 'mL',
    route: 'IV Infusion',
  },
  {
    id: 16,
    name: 'Magnesium Sulfate 20%',
    form: 'Injection',
    strength: '500 mg/mL',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 17,
    name: 'Magnesium Sulfate 50%',
    form: 'Injection',
    strength: '500 mg/mL',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 18,
    name: 'Metronidazole',
    form: 'Injection',
    strength: '500 mg/100 mL',
    doseUnit: 'mL',
    route: 'IV Infusion',
  },
  {
    id: 19,
    name: 'Calcium Gluconate',
    form: 'Injection',
    strength: '100 mg/mL',
    doseUnit: 'mL',
    route: 'IV Infusion',
  },
  {
    id: 20,
    name: 'Dexamethasone',
    form: 'Injection',
    strength: '4 mg/mL',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 21,
    name: 'Ampicillin',
    form: 'Injection',
    strength: '500 mg',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 22,
    name: 'Ampicillin',
    form: 'Injection',
    strength: '1000 mg',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 23,
    name: 'Lignocaine',
    form: 'Injection',
    strength: '2%',
    doseUnit: 'mL',
    route: 'Local infiltration',
  },
  {
    id: 24,
    name: 'Adrenaline',
    form: 'Injection',
    strength: '1 mg/mL',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 25,
    name: 'Hydrocortisone Succinate',
    form: 'Injection',
    strength: '100 mg',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 26,
    name: 'Hydrocortisone Succinate',
    form: 'Injection',
    strength: '200 mg',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 27,
    name: 'Diazepam',
    form: 'Injection',
    strength: '5 mg/mL',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 28,
    name: 'Pheniramine Maleate',
    form: 'Injection',
    strength: '22.75 mg/mL',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 29,
    name: 'Carboprost',
    form: 'Injection',
    strength: '125 ug',
    doseUnit: 'mL',
    route: 'Intramuscular (IM)',
  },
  {
    id: 30,
    name: 'Pentazocin Chloride',
    form: 'Injection',
    strength: '30 mg/mL',
    doseUnit: 'mL',
    route: 'Intramuscular (IM)',
  },
  {
    id: 31,
    name: 'Promethazine',
    form: 'Injection',
    strength: '25 mg/mL',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 32,
    name: 'Oxytocin',
    form: 'Injection',
    strength: '5 IU/mL',
    doseUnit: 'mL',
    route: 'IV Infusion',
  },
  {
    id: 33,
    name: 'Oxytocin',
    form: 'Injection',
    strength: '10 IU/mL',
    doseUnit: 'mL',
    route: 'IV Infusion',
  },
  {
    id: 34,
    name: 'Ringer Lactate',
    form: 'IV Fluid',
    strength: '-',
    doseUnit: 'mL',
    route: 'IV Infusion',
  },
  {
    id: 35,
    name: 'Normal Saline',
    form: 'IV Fluid',
    strength: '0.9%',
    doseUnit: 'mL',
    route: 'IV Infusion',
  },
  {
    id: 36,
    name: 'Dextrose (D5)',
    form: 'IV Fluid',
    strength: '5%',
    doseUnit: 'mL',
    route: 'IV Infusion',
  },
  {
    id: 37,
    name: 'Ceftriaxone',
    form: 'Injection',
    strength: '500 mg',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 38,
    name: 'Ceftriaxone',
    form: 'Injection',
    strength: '1000 mg',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
  {
    id: 39,
    name: 'Ceftriaxone',
    form: 'Injection',
    strength: '2000 mg',
    doseUnit: 'mL',
    route: 'Intravenous (IV)',
  },
];

/** How a preset reads in the medicine list: `Tablet Paracetamol 650 mg`. */
export function medicinePresetLabel(preset: MedicinePreset): string {
  return `${preset.form} ${preset.name} ${preset.strength}`;
}

/** prescribe-medication's typeOfMedicineList ("Form"). */
export const MEDICINE_FORMS = [
  'Tablet',
  'Capsule',
  'Injection',
  'Liquid',
  'Drop',
  'IV Fluid',
  'Inhaler',
  'Suppositorie',
  'Topical',
  'Implant',
  'Patche',
];

/** prescribe-medication's strengthList, in its order; any other strength may be typed. */
export const MEDICINE_STRENGTHS = [
  '5 mg',
  '10 mg',
  '50 mg',
  '75 mg',
  '100 mg',
  '500 mg',
  '1000 mg',
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
  '500 mg/mL',
  '500 mg/100 mL',
  '20 mg/mL',
  '40 mg/mL',
  '10 mg/mL',
  '200 ug',
  '400 mg',
  '650 mg',
];

/** prescribe-medication's dosageUnitList. */
export const DOSAGE_UNITS = ['mL', 'Tab', 'Cap', 'Drop'];

/** prescribe-medication's frequencyList. */
export const MEDICINE_FREQUENCIES = [
  'Once daily (OD)',
  'Twice daily (BD)',
  'Thrice daily (TID)',
  'Four times in a day (QID)',
  'Single Dose',
  'Stat Dose',
  'As required (SOS)',
];

/** prescribe-medication's routeList. */
export const MEDICINE_ROUTES = [
  'Oral',
  'Subcutaneous (SC)',
  'Intramuscular (IM)',
  'Intravenous (IV)',
  'Intrathecal',
  'Sublingual (SL)',
  'Buccal',
  'Rectal',
  'Ocular',
  'Transdermal',
  'Nasal',
  'Vaginal Route',
  'IV Infusion',
  'Intradermal (ID)',
  'Local infiltration',
];

/** prescribe-medication's durationUnitList. */
export const DURATION_UNITS = [
  'Minute',
  'Minutes',
  'Hour',
  'Hours',
  'Day',
  'Days',
];
