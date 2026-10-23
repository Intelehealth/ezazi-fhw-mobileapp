import { deepFreeze } from '../internal/deepFreeze';

/** Partogram section ids, in Android `PartogramConstants.SECTION_LIST` order. */
export const SECTION_ID = deepFreeze({
  SUPPORTIVE_CARE: 'supportiveCare',
  BABY: 'baby',
  WOMAN: 'woman',
  LABOUR_PROGRESS: 'labourProgress',
  MEDICATION: 'medication',
  SHARED_DECISION_MAKING: 'sharedDecisionMaking',
} as const);

export type SectionId = (typeof SECTION_ID)[keyof typeof SECTION_ID];
