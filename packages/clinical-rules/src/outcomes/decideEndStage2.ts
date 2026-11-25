import { REFER_TYPE_OTHER_VALUE, STAGE2_OTHER_CONCEPT_KEY, STAGE2_OUTCOME, OUTCOME_CONCEPT_KEY } from '../constants';
import type { Stage2OutcomeId } from '../constants';
import { motherDeathObs, referralObs, visitCompleteTime } from './completionObs';
import type { OutcomeDetails, OutcomeObs } from './completionObs';
import { STAGE2_OUTCOMES } from './stage2Outcomes';

/** End Stage 2 also writes its free-text comment, under END_2ND_STAGE_OTHER. */
export type Stage2OutcomeObs = OutcomeObs | { readonly conceptKey: typeof STAGE2_OTHER_CONCEPT_KEY; readonly value: string };

export interface EndStage2Details extends OutcomeDetails {
  /** The "Enter Other Comment" text (the `other` choice). */
  readonly otherComment?: string;
}

/**
 * `openDeliveryForm`: "Stage-3 & Early Postpartum" goes on to Android's Women Delivery Details form, which
 * writes the delivery outcome and Stage 3's first card (not this function). `completeVisit`: as End Stage 1.
 */
export type EndStage2Decision =
  | { readonly kind: 'openDeliveryForm' }
  | { readonly kind: 'completeVisit'; readonly visitCompleteTime: string; readonly obs: readonly Stage2OutcomeObs[] }
  | { readonly kind: 'reasonRequired' }
  | { readonly kind: 'otherCommentRequired' };

/**
 * What one End Stage 2 choice writes (Android `CompleteVisitOnEnd2StageDialog.manageBirthOutcomeSelection`):
 * Mother Death and the referrals as End Stage 1; "Other" writes REFER_TYPE "Other" and the comment
 * (`completeVisitWithOtherReferType`).
 */
export function decideEndStage2(outcomeId: Stage2OutcomeId, details: EndStage2Details, now: number): EndStage2Decision {
  if (outcomeId === STAGE2_OUTCOME.STAGE3_EARLY_POSTPARTUM) return { kind: 'openDeliveryForm' };

  let obs: Stage2OutcomeObs[];
  if (outcomeId === STAGE2_OUTCOME.MOTHER_DEATH) {
    if (!details.reason) return { kind: 'reasonRequired' };
    obs = motherDeathObs(details.reason);
  } else if (outcomeId === STAGE2_OUTCOME.OTHER) {
    const comment = details.otherComment?.trim();
    if (!comment) return { kind: 'otherCommentRequired' };
    obs = [
      { conceptKey: OUTCOME_CONCEPT_KEY.REFER_TYPE, value: REFER_TYPE_OTHER_VALUE },
      { conceptKey: STAGE2_OTHER_CONCEPT_KEY, value: details.otherComment ?? comment },
    ];
  } else {
    const referType = STAGE2_OUTCOMES.find((o) => o.id === outcomeId)?.referType ?? null;
    obs = referType ? referralObs(referType, outcomeId === STAGE2_OUTCOME.REFER_OTHER_HOSPITAL, details) : [];
  }
  return { kind: 'completeVisit', visitCompleteTime: visitCompleteTime(now), obs };
}
