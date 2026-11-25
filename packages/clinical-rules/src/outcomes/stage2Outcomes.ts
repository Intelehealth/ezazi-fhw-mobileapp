import { STAGE2_OUTCOME, outcomeLabelKey } from '../constants';
import type { Stage2OutcomeId } from '../constants';
import { deepFreeze } from '../internal/deepFreeze';

/**
 * One End Stage 2 choice. `referType` is the REFER_TYPE stored for a referral: always the English label, as
 * End Stage 1 (Android compares its English labels with translated text there, so other languages fail).
 * `kind`: Android's checkboxes (Stage 3, Mother Death), its rows (the referrals) and the free-text comment.
 */
export interface Stage2OutcomeDefinition {
  readonly id: Stage2OutcomeId;
  readonly kind: 'checkbox' | 'row' | 'text';
  readonly labelKey: string;
  readonly androidLabel: string; // CompletedVisitStatus labels, English in Android too
  readonly referType: string | null;
}

const outcome = (
  id: Stage2OutcomeId,
  kind: Stage2OutcomeDefinition['kind'],
  androidLabel: string,
  refers: boolean,
): Stage2OutcomeDefinition => ({
  id,
  kind,
  labelKey: outcomeLabelKey(`stage2.${id}`),
  androidLabel,
  referType: refers ? androidLabel : null,
});

/** In Android's dialog order. */
export const STAGE2_OUTCOMES: readonly Stage2OutcomeDefinition[] = deepFreeze([
  outcome(STAGE2_OUTCOME.STAGE3_EARLY_POSTPARTUM, 'checkbox', 'Stage-3 & Early Postpartum', false),
  outcome(STAGE2_OUTCOME.REFER_OTHER_HOSPITAL, 'row', 'Refer to other Hospital', true),
  outcome(STAGE2_OUTCOME.SELF_DISCHARGE, 'row', 'Self discharge against Medical Advice', true),
  outcome(STAGE2_OUTCOME.SHIFT_TO_C_SECTION, 'row', 'Shift to C-Section', true),
  outcome(STAGE2_OUTCOME.REFER_TO_ICU, 'row', 'Refer to high dependency unit / ICU', true),
  outcome(STAGE2_OUTCOME.MOTHER_DEATH, 'checkbox', 'Mother Death', false),
  outcome(STAGE2_OUTCOME.OTHER, 'text', 'Other', false),
]);
