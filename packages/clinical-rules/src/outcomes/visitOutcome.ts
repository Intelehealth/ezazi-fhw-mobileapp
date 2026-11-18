import { OUTCOME_CONCEPT_KEY, REFER_TYPE_OTHER_VALUE, STAGE2_OTHER_CONCEPT_KEY } from '../constants';

/** A completed visit's outcome obs, by app concept key (the VISIT_COMPLETE encounter's rows). */
export type VisitOutcomeObs = Partial<
  Record<
    | typeof OUTCOME_CONCEPT_KEY.REFER_TYPE
    | typeof OUTCOME_CONCEPT_KEY.MOTHER_DECEASED
    | typeof OUTCOME_CONCEPT_KEY.MOTHER_DECEASED_FLAG
    | typeof STAGE2_OTHER_CONCEPT_KEY,
    string
  >
>;

export interface VisitOutcomeSummary {
  /** What the Timeline names the outcome: the stored REFER_TYPE, or "Mother Death". Empty when none. */
  readonly outcome: string;
  readonly hasMotherDeceased: boolean;
  readonly motherDeceasedReason: string | null;
  /** End Stage 2's "Other" comment. */
  readonly otherComment: string | null;
}

// Android `CompletedVisitStatus.MotherDeceased.MOTHER_DECEASED_FLAG.sortValue()`.
export const MOTHER_DEATH_OUTCOME_LABEL = 'Mother Death';

/**
 * The outcome Android's Timeline shows for a completed visit (`ObsDAO.findOutcome`), for what End Stage 1
 * and 2 write: a referral (and "Other" with its comment), or Mother Death with its reason. Delivery outcome
 * (Stage 3), out-of-time and newborn outcomes come with Stage 3.
 */
export function summarizeVisitOutcome(obs: VisitOutcomeObs): VisitOutcomeSummary {
  const referType = obs[OUTCOME_CONCEPT_KEY.REFER_TYPE];
  if (referType !== undefined) {
    return {
      outcome: referType,
      hasMotherDeceased: false,
      motherDeceasedReason: null,
      otherComment: referType.toLowerCase() === REFER_TYPE_OTHER_VALUE.toLowerCase() ? (obs[STAGE2_OTHER_CONCEPT_KEY] ?? null) : null,
    };
  }
  const reason = obs[OUTCOME_CONCEPT_KEY.MOTHER_DECEASED];
  if (reason !== undefined) {
    return { outcome: MOTHER_DEATH_OUTCOME_LABEL, hasMotherDeceased: true, motherDeceasedReason: reason, otherComment: null };
  }
  return { outcome: '', hasMotherDeceased: false, motherDeceasedReason: null, otherComment: null };
}
