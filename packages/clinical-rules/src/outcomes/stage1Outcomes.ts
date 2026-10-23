import { STAGE1_OUTCOME, outcomeLabelKey } from '../constants';
import type { Stage1OutcomeId } from '../constants';
import { deepFreeze } from '../internal/deepFreeze';

/**
 * One End Stage 1 choice. `referType` is the REFER_TYPE value stored for it: Android stores the
 * label in the phone's language; here it is always the English label (decided 2026-10-23, Kaveri).
 */
export interface OutcomeDefinition {
  readonly id: Stage1OutcomeId;
  readonly labelKey: string;
  readonly androidLabel: string; // res/values/strings*.xml
  readonly referType: string | null;
}

const outcome = (id: Stage1OutcomeId, androidLabel: string, refers: boolean): OutcomeDefinition => ({
  id,
  labelKey: outcomeLabelKey(id),
  androidLabel,
  referType: refers ? androidLabel : null,
});

/** In Android's dialog order (`CompleteVisitOnEndStage1Dialog.buildDialogSingleSelection`). */
export const STAGE1_OUTCOMES: readonly OutcomeDefinition[] = deepFreeze([
  outcome(STAGE1_OUTCOME.MOVE_TO_STAGE2, 'Move to Stage 2', false),
  outcome(STAGE1_OUTCOME.REFER_OTHER_HOSPITAL, 'Refer to other Hospital', true),
  outcome(STAGE1_OUTCOME.SELF_DISCHARGE, 'Self discharge against Medical Advice', true),
  outcome(STAGE1_OUTCOME.SHIFT_TO_C_SECTION, 'Shift to C-Section', true),
  outcome(STAGE1_OUTCOME.REFER_TO_ICU, 'Refer to high dependency unit / ICU', true),
  outcome(STAGE1_OUTCOME.MOTHER_DEATH, 'Mother Death', false),
]);

// Android `EncounterDAO.insertVisitCompleteEncounterToDb` dates the encounter two minutes back.
export const VISIT_COMPLETE_BACKDATE_MINUTES = 2;
