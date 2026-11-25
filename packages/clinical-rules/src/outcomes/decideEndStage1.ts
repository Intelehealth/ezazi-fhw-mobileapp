import { getStageStart } from '../cards/stageStart';
import type { StageStart } from '../cards/types';
import { STAGE, STAGE1_OUTCOME } from '../constants';
import type { Stage1OutcomeId } from '../constants';
import { motherDeathObs, referralObs, visitCompleteTime } from './completionObs';
import type { OutcomeDetails, OutcomeObs } from './completionObs';
import { STAGE1_OUTCOMES } from './stage1Outcomes';

export type { OutcomeDetails, OutcomeObs } from './completionObs';

/**
 * `startStage2`: write Stage 2's first card and clear Decision Pending. `completeVisit`: write the
 * VISIT_COMPLETE encounter at `visitCompleteTime` with these obs, set the visit end date, mark it read.
 */
export type EndStage1Decision =
  | { readonly kind: 'startStage2'; readonly start: StageStart }
  | { readonly kind: 'completeVisit'; readonly visitCompleteTime: string; readonly obs: readonly OutcomeObs[] }
  | { readonly kind: 'reasonRequired' };

/** What one End Stage 1 choice writes, as Android's `ReferTypeHelper` / `VisitCompletionHelper`. */
export function decideEndStage1(outcomeId: Stage1OutcomeId, details: OutcomeDetails, now: number): EndStage1Decision {
  if (outcomeId === STAGE1_OUTCOME.MOVE_TO_STAGE2) return { kind: 'startStage2', start: getStageStart(STAGE.STAGE2, now) };

  let obs: OutcomeObs[];
  if (outcomeId === STAGE1_OUTCOME.MOTHER_DEATH) {
    if (!details.reason) return { kind: 'reasonRequired' };
    obs = motherDeathObs(details.reason);
  } else {
    const referType = STAGE1_OUTCOMES.find((o) => o.id === outcomeId)?.referType ?? null;
    obs = referType ? referralObs(referType, outcomeId === STAGE1_OUTCOME.REFER_OTHER_HOSPITAL, details) : [];
  }
  return { kind: 'completeVisit', visitCompleteTime: visitCompleteTime(now), obs };
}
