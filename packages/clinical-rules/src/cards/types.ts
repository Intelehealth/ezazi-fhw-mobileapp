import type {
  DECISION_PENDING_CLEARED,
  DECISION_PENDING_SET,
  NORMAL_CARD_MARKER,
  PRIVACY_NOTICE_VALUE,
  STAGE,
} from '../constants';

/** Stages whose cards the timer creates. Stage 4 (postpartum) joins later. */
export type MonitoringStage = typeof STAGE.STAGE1 | typeof STAGE.STAGE2;

/** Value of the ENCOUNTER_TYPE obs on a timer card (Android `EncounterDTO.Type.NORMAL`). */
export type CardMarker = typeof NORMAL_CARD_MARKER;

/** Stored values of the DECISION_PENDING visit attribute. */
export type DecisionPendingValue = typeof DECISION_PENDING_SET | typeof DECISION_PENDING_CLEARED;

/** `tbl_encounter.privacynotice_value` Android writes on a card. */
export type PrivacyNoticeValue = typeof PRIVACY_NOTICE_VALUE;

/** One card in a stage's fixed sequence. All durations are minutes. */
export interface CardDefinition {
  readonly name: string; // encounter type name, e.g. 'Stage1_Hour1_1'
  readonly stage: MonitoringStage;
  readonly hour: number; // 1-based, as written in the name
  readonly slot: number; // 1-based card within that hour
  readonly position: number; // 0-based within the stage
  readonly offsetMinutes: number; // nominal time after the stage's first card
  readonly intervalMinutes: number; // wait after this card before the next
  readonly isLast: boolean;
}

/**
 * Android's "latest card": the visit's newest non-voided encounter, excluding
 * VISIT_COMPLETE, LCG_SOS and ENCOUNTER_ADMISSION (`EncounterDAO.getEncounterByVisitUUIDLimit1`;
 * mobile: `encounter.findLatestClinicalByVisit`). Its type name and UTC `encounter_time`.
 */
export interface LatestCard {
  readonly name: string;
  readonly encounterTime: string;
}

/**
 * What the timer should do for one visit on one tick. Plain data: the caller
 * maps it to its own storage (mobile repositories) or ignores it (web).
 */
export type CardStep =
  | {
      readonly kind: 'createCard';
      readonly card: CardDefinition;
      readonly encounterTime: string;
      readonly marker: CardMarker;
      readonly privacyNoticeValue: PrivacyNoticeValue;
    }
  | {
      readonly kind: 'markDecisionPending';
      readonly stage: MonitoringStage;
      readonly value: DecisionPendingValue;
    }
  | { readonly kind: 'preSync'; readonly dueAt: number }
  | { readonly kind: 'wait'; readonly dueAt: number }
  | { readonly kind: 'notMonitored' }
  | { readonly kind: 'invalidTime' };

/** The next thing due for a visit, for countdowns. `dueAt` is epoch ms. */
export type UpcomingStep =
  | { readonly kind: 'card'; readonly card: CardDefinition; readonly dueAt: number }
  | { readonly kind: 'decisionPending'; readonly stage: MonitoringStage; readonly dueAt: number };

/** What starting a stage writes: its first card and the Decision Pending reset. */
export interface StageStart {
  readonly stage: MonitoringStage;
  readonly card: CardDefinition;
  readonly encounterTime: string;
  readonly marker: CardMarker | null; // null: Android writes none on Stage 1's first card
  readonly privacyNoticeValue: PrivacyNoticeValue | null; // null on Stage 1's first card
  readonly decisionPending: DecisionPendingValue;
}
