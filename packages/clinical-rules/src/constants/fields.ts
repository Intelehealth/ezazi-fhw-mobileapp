/**
 * Field ids: THE single source. Every other file references these constants;
 * never retype an id as a string. Order is Android's display order.
 */
export const FIELD_ID = {
  COMPANION: 'companion',
  PAIN_RELIEF: 'painRelief',
  ORAL_FLUID: 'oralFluid',
  POSTURE: 'posture',
  BASELINE_FHR: 'baselineFhr',
  FHR_DECELERATION: 'fhrDeceleration',
  AMNIOTIC_FLUID: 'amnioticFluid',
  FETAL_POSITION: 'fetalPosition',
  CAPUT: 'caput',
  MOULDING: 'moulding',
  PULSE: 'pulse',
  SYSTOLIC_BP: 'systolicBp',
  DIASTOLIC_BP: 'diastolicBp',
  TEMPERATURE: 'temperature',
  URINE_PROTEIN: 'urineProtein',
  URINE_ACETONE: 'urineAcetone',
  CONTRACTIONS_PER_10MIN: 'contractionsPer10Min',
  CONTRACTION_DURATION: 'contractionDuration',
  CERVIX: 'cervix',
  DESCENT: 'descent',
  OXYTOCIN: 'oxytocin',
  MEDICINE: 'medicine',
  IV_FLUIDS: 'ivFluids',
  ASSESSMENT: 'assessment',
  PLAN: 'plan',
  SUPERVISOR_DOCTOR: 'supervisorDoctor',
} as const;

export type FieldId = (typeof FIELD_ID)[keyof typeof FIELD_ID];

/**
 * The app concept constant each field is stored under (mobile `core/db/constants/obs.ts`).
 * Names, never uuids: each app resolves the uuid.
 */
export const FIELD_CONCEPT_KEY = {
  [FIELD_ID.COMPANION]: 'COMPANION',
  [FIELD_ID.PAIN_RELIEF]: 'PAIN_RELIEF',
  [FIELD_ID.ORAL_FLUID]: 'ORAL_FLUID',
  [FIELD_ID.POSTURE]: 'POSTURE',
  [FIELD_ID.BASELINE_FHR]: 'BASELINE_FHR',
  [FIELD_ID.FHR_DECELERATION]: 'FHR_DECELERATION',
  [FIELD_ID.AMNIOTIC_FLUID]: 'AMNIOTIC_FLUID',
  [FIELD_ID.FETAL_POSITION]: 'FETAL_POSITION',
  [FIELD_ID.CAPUT]: 'CAPUT',
  [FIELD_ID.MOULDING]: 'MOULDING',
  [FIELD_ID.PULSE]: 'PULSE',
  [FIELD_ID.SYSTOLIC_BP]: 'SYSTOLIC_BP',
  [FIELD_ID.DIASTOLIC_BP]: 'DIASTOLIC_BP',
  [FIELD_ID.TEMPERATURE]: 'TEMPERATURE',
  [FIELD_ID.URINE_PROTEIN]: 'URINE_PROTEIN',
  [FIELD_ID.URINE_ACETONE]: 'URINE_ACETONE',
  [FIELD_ID.CONTRACTIONS_PER_10MIN]: 'CONTRACTIONS_PER_10MIN',
  [FIELD_ID.CONTRACTION_DURATION]: 'DURATION_OF_CONTRACTION',
  [FIELD_ID.CERVIX]: 'CERVIX_PLOT_X',
  [FIELD_ID.DESCENT]: 'DESCENT_PLOT_0',
  [FIELD_ID.OXYTOCIN]: 'OXYTOCIN_UL_DROPS_MIN',
  [FIELD_ID.MEDICINE]: 'MEDICINE',
  [FIELD_ID.IV_FLUIDS]: 'IV_FLUIDS',
  [FIELD_ID.ASSESSMENT]: 'ASSESSMENT',
  [FIELD_ID.PLAN]: 'PLAN',
  [FIELD_ID.SUPERVISOR_DOCTOR]: 'SUPERVISOR_DOCTOR',
} as const satisfies Record<FieldId, string>;

export type ConceptKey = (typeof FIELD_CONCEPT_KEY)[FieldId];
