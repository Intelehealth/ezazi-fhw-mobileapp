import type { LcgReadingKey } from './elcg.types';

export interface LcgReadingRowConfig {
  key: LcgReadingKey;
  label: string;
  /** The guide's ALERT column — the values that should be circled. */
  alertCriteria: string;
  /** Dotted rule between each half-hour pair, for the rows plotted every 30 minutes. */
  isHalfHourly?: boolean;
}

export interface LcgReadingSectionConfig {
  title: string;
  rows: LcgReadingRowConfig[];
}

/**
 * The single-value sections of partogram.component.html, top to bottom, with
 * its labels and alert criteria verbatim. Labour Progress's cervix/descent
 * plots and everything below them have their own layouts, so they live in
 * the table component instead.
 */
export const SUPPORTIVE_CARE_SECTION: LcgReadingSectionConfig = {
  title: 'SUPPORTIVE CARE',
  rows: [
    { key: 'companion', label: 'Companion', alertCriteria: 'N' },
    { key: 'painRelief', label: 'Pain Relief', alertCriteria: 'N' },
    { key: 'oralFluid', label: 'Oral Fluid', alertCriteria: 'N' },
    { key: 'posture', label: 'Posture', alertCriteria: 'SP' },
  ],
};

export const BABY_SECTION: LcgReadingSectionConfig = {
  title: 'BABY',
  rows: [
    {
      key: 'baselineFhr',
      label: 'Baseline FHR',
      alertCriteria: '<110, ≥160',
      isHalfHourly: true,
    },
    {
      key: 'fhrDeceleration',
      label: 'FHR deceleration',
      alertCriteria: 'L',
      isHalfHourly: true,
    },
    { key: 'amnioticFluid', label: 'Amniotic Fluid', alertCriteria: 'M+++, B' },
    { key: 'fetalPosition', label: 'Fetal Position', alertCriteria: 'P, T' },
    { key: 'caput', label: 'Caput', alertCriteria: '+++' },
    { key: 'moulding', label: 'Moulding', alertCriteria: '+++' },
  ],
};

export const WOMAN_SECTION: LcgReadingSectionConfig = {
  title: 'WOMEN',
  rows: [
    { key: 'pulse', label: 'Pulse', alertCriteria: '<60, ≥120' },
    { key: 'systolicBp', label: 'Systolic BP', alertCriteria: '<80, ≥140' },
    { key: 'diastolicBp', label: 'Diastolic BP', alertCriteria: '≥90' },
    {
      key: 'temperature',
      label: 'Temperature °F',
      alertCriteria: '<95.0, ≥99.5',
    },
    { key: 'urineProtein', label: 'Urine Protein', alertCriteria: 'P3+, P4+' },
    { key: 'urineAcetone', label: 'Urine Acetone', alertCriteria: 'A3+, A4+' },
  ],
};

export const CONTRACTION_ROWS: LcgReadingRowConfig[] = [
  {
    key: 'contractions',
    label: 'Contractions per 10 min',
    alertCriteria: '≤2, >5',
    isHalfHourly: true,
  },
  {
    key: 'contractionDuration',
    label: 'Duration of contractions',
    alertCriteria: '<20, >60',
    isHalfHourly: true,
  },
];

/** Cervix rows, 10 cm down to 5 cm, each with the lag time that triggers an alert. */
export const CERVIX_PLOT_ROWS: { value: string; alertCriteria: string }[] = [
  { value: '10', alertCriteria: '' },
  { value: '9', alertCriteria: '≥2h' },
  { value: '8', alertCriteria: '≥2.5h' },
  { value: '7', alertCriteria: '≥3h' },
  { value: '6', alertCriteria: '≥5h' },
  { value: '5', alertCriteria: '≥6h' },
];

/** Descent rows, 5 down to 0. */
export const DESCENT_PLOT_ROWS = ['5', '4', '3', '2', '1', '0'];

export const CERVIX_STAGE2_INSTRUCTION =
  'In active first stage, plot ‘X’ to record cervical dilatation. Alert triggered when lag time for current cervical dilatation is exceeded with no progress. In second stage, insert ‘P’ to indicate when pushing begins.';

export const LCG_FOOTER_INSTRUCTIONS =
  'INSTRUCTIONS: CIRCLE ANY OBSERVATION MEETING THE CRITERIA IN THE ‘ALERT’ COLUMN, ALERT THE SENIOR MIDWIFE OR DOCTOR AND RECORD THE ASSESSMENT AND ACTION TAKEN. IF LABOUR EXTENDS BEYOND 12H, PLEASE CONTINUE ON A NEW LABOUR CARE GUIDE.';

export const LCG_ABBREVIATIONS: [string, string][] = [
  ['Y', 'Yes'],
  ['N', 'No'],
  ['D', 'Declined'],
  ['U', 'Unknown'],
  ['SP', 'Supine'],
  ['MO', 'Mobile'],
  ['E', 'Early'],
  ['L', 'Late'],
  ['V', 'Variable'],
  ['I', 'Intact'],
  ['C', 'Clear'],
  ['M', 'Meconium'],
  ['B', 'Blood'],
  ['A', 'Anterior'],
  ['P', 'Posterior'],
  ['T', 'Transverse'],
  ['P+', 'Protein'],
  ['A+', 'Acetone'],
];
