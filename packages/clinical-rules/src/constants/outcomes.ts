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

/**
 * End Stage 2 choices, in Android's "Additional Information" dialog order (`CompleteVisitOnEnd2StageDialog`,
 * birth_outcome_dialog.xml). Android's extra "Self discharge" row with no handler is left out (Kaveri, 2026-11-06).
 */
export const STAGE2_OUTCOME = deepFreeze({
  STAGE3_EARLY_POSTPARTUM: 'stage3EarlyPostpartum',
  REFER_OTHER_HOSPITAL: 'referOtherHospital',
  SELF_DISCHARGE: 'selfDischarge',
  SHIFT_TO_C_SECTION: 'shiftToCSection',
  REFER_TO_ICU: 'referToIcu',
  MOTHER_DEATH: 'motherDeath',
  OTHER: 'other',
} as const);

export type Stage2OutcomeId = (typeof STAGE2_OUTCOME)[keyof typeof STAGE2_OUTCOME];

/** End Stage 2's free-text comment is stored under this app concept (mobile `END_2ND_STAGE_OTHER`). */
export const STAGE2_OTHER_CONCEPT_KEY = 'END_2ND_STAGE_OTHER' as const;

/** REFER_TYPE for End Stage 2's free-text "Other" (Android `CompletedVisitStatus.ReferType.OTHER`). */
export const REFER_TYPE_OTHER_VALUE = 'Other';

// Android caps the Mother Death reason and End Stage 2's comment at 300 characters (maxLength, counter).
export const OUTCOME_TEXT_MAX_LENGTH = 300;
