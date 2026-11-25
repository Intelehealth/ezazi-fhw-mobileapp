import { MOTHER_DECEASED_YES, OUTCOME_CONCEPT_KEY } from '../constants';
import type { OutcomeConceptKey } from '../constants';
import { MS_PER_MINUTE, formatUtcTimestamp } from '../time/utcTimestamp';
import { VISIT_COMPLETE_BACKDATE_MINUTES } from './stage1Outcomes';

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
 * The obs one referral writes, shared by End Stage 1 and 2 (Android `ReferTypeHelper`): REFER_TYPE, and for
 * "Refer to other Hospital" the hospital, doctor and note when typed.
 */
export function referralObs(referType: string, withHospital: boolean, details: OutcomeDetails): OutcomeObs[] {
  const obs: OutcomeObs[] = [{ conceptKey: OUTCOME_CONCEPT_KEY.REFER_TYPE, value: referType }];
  const add = (conceptKey: OutcomeConceptKey, value: string | undefined) => {
    if (value) obs.push({ conceptKey, value });
  };
  if (withHospital) {
    add(OUTCOME_CONCEPT_KEY.REFER_HOSPITAL, details.hospitalName);
    add(OUTCOME_CONCEPT_KEY.REFER_DR_NAME, details.doctorName);
    add(OUTCOME_CONCEPT_KEY.REFER_NOTE, details.note);
  }
  return obs;
}

/** Mother Death, shared by End Stage 1 and 2 (`VisitCompletionHelper.addMotherDeceasedObs`): flag YES, then the reason. */
export function motherDeathObs(reason: string): OutcomeObs[] {
  return [
    { conceptKey: OUTCOME_CONCEPT_KEY.MOTHER_DECEASED_FLAG, value: MOTHER_DECEASED_YES },
    { conceptKey: OUTCOME_CONCEPT_KEY.MOTHER_DECEASED, value: reason },
  ];
}

/** The VISIT_COMPLETE encounter's time: two minutes back, as Android's `insertVisitCompleteEncounterToDb`. */
export function visitCompleteTime(now: number): string {
  return formatUtcTimestamp(now - VISIT_COMPLETE_BACKDATE_MINUTES * MS_PER_MINUTE);
}
