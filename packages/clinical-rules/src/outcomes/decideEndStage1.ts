import { getStageStart } from '../cards/stageStart';
import type { StageStart } from '../cards/types';
import { MOTHER_DECEASED_YES, OUTCOME_CONCEPT_KEY, STAGE, STAGE1_OUTCOME } from '../constants';
import type { OutcomeConceptKey, Stage1OutcomeId } from '../constants';
import { MS_PER_MINUTE, formatUtcTimestamp } from '../time/utcTimestamp';
import { STAGE1_OUTCOMES, VISIT_COMPLETE_BACKDATE_MINUTES } from './stage1Outcomes';

/** Optional text the nurse types: referral details, or the reason for a mother's death. */
export interface OutcomeDetails {
  readonly hospitalName?: string;
  readonly doctorName?: string;
  readonly note?: string;
  readonly reason?: string;
}

export interface OutcomeObs {
  readonly conceptKey: OutcomeConceptKey;
  readonly value: string;
}

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

  const obs: OutcomeObs[] = [];
  const add = (conceptKey: OutcomeConceptKey, value: string | undefined) => {
    if (value) obs.push({ conceptKey, value });
  };

  if (outcomeId === STAGE1_OUTCOME.MOTHER_DEATH) {
    if (!details.reason) return { kind: 'reasonRequired' };
    add(OUTCOME_CONCEPT_KEY.MOTHER_DECEASED_FLAG, MOTHER_DECEASED_YES);
    add(OUTCOME_CONCEPT_KEY.MOTHER_DECEASED, details.reason);
  } else {
    add(OUTCOME_CONCEPT_KEY.REFER_TYPE, STAGE1_OUTCOMES.find((o) => o.id === outcomeId)?.referType ?? undefined);
    if (outcomeId === STAGE1_OUTCOME.REFER_OTHER_HOSPITAL) {
      add(OUTCOME_CONCEPT_KEY.REFER_HOSPITAL, details.hospitalName);
      add(OUTCOME_CONCEPT_KEY.REFER_DR_NAME, details.doctorName);
      add(OUTCOME_CONCEPT_KEY.REFER_NOTE, details.note);
    }
  }

  const visitCompleteTime = formatUtcTimestamp(now - VISIT_COMPLETE_BACKDATE_MINUTES * MS_PER_MINUTE);
  return { kind: 'completeVisit', visitCompleteTime, obs };
}
