import { deepFreeze } from '../internal/deepFreeze';

/** End Stage 1 outcomes, in Android's dialog order (`CompleteVisitOnEndStage1Dialog`). */
export const STAGE1_OUTCOME = deepFreeze({
  MOVE_TO_STAGE2: 'moveToStage2',
  REFER_OTHER_HOSPITAL: 'referOtherHospital',
  SELF_DISCHARGE: 'selfDischarge',
  SHIFT_TO_C_SECTION: 'shiftToCSection',
  REFER_TO_ICU: 'referToIcu',
  MOTHER_DEATH: 'motherDeath',
} as const);

export type Stage1OutcomeId = (typeof STAGE1_OUTCOME)[keyof typeof STAGE1_OUTCOME];

/** The app concept constants an outcome is stored under (mobile `core/db/constants/obs.ts`). */
export const OUTCOME_CONCEPT_KEY = deepFreeze({
  REFER_TYPE: 'REFER_TYPE',
  REFER_HOSPITAL: 'REFER_HOSPITAL',
  REFER_DR_NAME: 'REFER_DR_NAME',
  REFER_NOTE: 'REFER_NOTE',
  MOTHER_DECEASED_FLAG: 'MOTHER_DECEASED_FLAG',
  MOTHER_DECEASED: 'MOTHER_DECEASED',
} as const);

export type OutcomeConceptKey = (typeof OUTCOME_CONCEPT_KEY)[keyof typeof OUTCOME_CONCEPT_KEY];
