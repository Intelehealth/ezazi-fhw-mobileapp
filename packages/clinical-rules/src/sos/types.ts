import type { CARD_NAME_PART, NORMAL_CARD_MARKER, StageId } from '../constants';

/** Stages an SOS card can be raised in. Stage 4 is the postpartum stage (Android `Stage3_*` cards). */
export type SosStage = StageId;

/** The parts of an `SOS_STAGE_HOUR` value such as `Stage1_Hour3_SOS2`. */
export interface SosLabel {
  readonly stage: SosStage;
  readonly hour: number; // the reference card's hour, a card counter
  readonly index: number; // 1, 2, 3 … within that stage and hour
}

/** Android's "latest card" (same query as the timer), as stored. */
export interface SosReferenceCard {
  readonly name: string; // encounter type name, e.g. 'Stage1_Hour3_2'
  readonly providerUuid: string | null;
  readonly privacyNoticeValue: string | null;
}

/** What the app knows about the visit when the nurse taps SOS. */
export interface SosRequest {
  readonly visitCompleted: boolean; // a VISIT_COMPLETE encounter exists
  readonly isVisitHolder: boolean; // the logged-in provider holds the visit
  readonly decisionPending: boolean; // DECISION_PENDING visit attribute is 'true'
  readonly latestCard: SosReferenceCard | null;
  readonly latestSosLabel: string | null; // SOS_STAGE_HOUR of the newest non-voided SOS
}

/** Why no SOS card is created. `decisionPending` is ours: Android allows it (decided 2026-10-15). */
export type SosBlockReason =
  | 'visitCompleted'
  | 'notVisitHolder'
  | 'decisionPending'
  | 'noLatestCard'
  | 'latestIsNotACard';

/**
 * The SOS card to write: an LCG_SOS encounter timed `encounterTime`, provider and privacy
 * notice copied from the latest card (Android), plus one SOS_STAGE_HOUR obs = `label`.
 * No ENCOUNTER_TYPE obs, no alert code.
 */
export type SosDecision =
  | {
      readonly kind: 'createSos';
      readonly label: string;
      readonly stage: SosStage;
      readonly hour: number;
      readonly index: number;
      readonly encounterTime: string;
      readonly providerUuid: string | null;
      readonly privacyNoticeValue: string | null;
    }
  | { readonly kind: 'blocked'; readonly reason: SosBlockReason };

/** How a card's ENCOUNTER_TYPE / SOS_STAGE_HOUR value marks it (`EncounterTypeResolver.kt`). */
export type EncounterKind = typeof NORMAL_CARD_MARKER | typeof CARD_NAME_PART.SOS;
