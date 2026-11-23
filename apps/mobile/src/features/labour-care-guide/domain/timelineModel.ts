import { STAGE, findCard, getCardStatus, getUpcomingStep } from '@ezazi/clinical-rules';
import type { CardState, StageId, TimelineVisitFacts, VisitOutcomeSummary } from '@ezazi/clinical-rules';

import { epochToIso, utcTimestampToIso } from '@/core/utils/datetime';

import type { CheckpointStatus, LabourStage, TimelineCheckpoint } from './timeline.types';

/** One stored timeline card, as the data layer reads it (oldest first). */
export interface TimelineCardRow {
  encounterUuid: string;
  cardName: string | null; // null for an SOS card or an unnamed type
  isSos: boolean;
  encounterTime: string; // stored UTC text
  hasRealObs: boolean;
  hasMissedMarker: boolean;
  recordedAt: string | null; // newest real obs created_date, stored UTC text
}

/** The patient fields the header shows. */
export interface PatientRow {
  patientUuid: string;
  openmrsId: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null; // yyyy-MM-dd
  gravida: string | null;
}

export const UPCOMING_CHECKPOINT_ID = 'upcoming';

const STAGE_ON_SCREEN: Readonly<Record<StageId, LabourStage>> = {
  [STAGE.STAGE1]: 'stage1',
  [STAGE.STAGE2]: 'stage2',
  [STAGE.STAGE4]: 'earlyPostpartum', // Android's "Stage3_*" cards
};

/** The stepper stage a package stage is shown as. */
export function labourStageOf(stage: StageId): LabourStage {
  return STAGE_ON_SCREEN[stage];
}

const statusOf = (state: CardState): CheckpointStatus => {
  if (state === 'submitted') return 'completed';
  return state === 'pending' ? 'dueNow' : 'missed';
};

/**
 * The stored cards with their state from `getCardStatus`, then the next card projected by
 * `getUpcomingStep` while it is still in the future and the stage is open.
 */
export function buildCheckpoints(rows: readonly TimelineCardRow[], visit: TimelineVisitFacts, now: number): TimelineCheckpoint[] {
  const checkpoints: TimelineCheckpoint[] = [];

  rows.forEach((row, index) => {
    const scheduledAt = utcTimestampToIso(row.encounterTime);
    if (!scheduledAt) return;
    const status = getCardStatus(
      { isNewest: index === rows.length - 1, hasRealObs: row.hasRealObs, hasMissedMarker: row.hasMissedMarker },
      visit,
    );
    checkpoints.push({
      id: row.encounterUuid,
      encounterUuid: row.encounterUuid,
      cardName: row.cardName ?? undefined,
      scheduledAt,
      status: statusOf(status.state),
      isSos: row.isSos,
      recordedAt: status.state === 'submitted' ? utcTimestampToIso(row.recordedAt) ?? undefined : undefined,
      access: status.access,
      showEditIcon: status.showEditIcon,
    });
  });

  const latestCard = [...rows].reverse().find((row) => !row.isSos && row.cardName);
  if (latestCard?.cardName && !visit.decisionPending && !visit.visitComplete) {
    const upcoming = getUpcomingStep({ name: latestCard.cardName, encounterTime: latestCard.encounterTime });
    if (upcoming?.kind === 'card' && upcoming.dueAt > now) {
      checkpoints.push({
        id: UPCOMING_CHECKPOINT_ID,
        cardName: upcoming.card.name,
        scheduledAt: epochToIso(upcoming.dueAt),
        status: 'upcoming',
        access: 'none',
        showEditIcon: false,
      });
    }
  }

  return checkpoints;
}

/**
 * The stage heading drawn above each checkpoint, or null when it continues the stage above it. Android
 * labels the first card of each stage ("Stage 1", "Stage 2"; TimelineAdapter tvStage); an SOS card belongs
 * to the stage it was captured in, the one of the card before it.
 */
export function stageHeadings(checkpoints: readonly TimelineCheckpoint[], fallback: LabourStage): (LabourStage | null)[] {
  let current: LabourStage | null = null;
  return checkpoints.map((checkpoint) => {
    const stage = checkpoint.cardName ? findCard(checkpoint.cardName)?.stage : undefined;
    const own: LabourStage = stage ? labourStageOf(stage) : (current ?? fallback);
    const heading = own === current ? null : own;
    current = own;
    return heading;
  });
}

/** The stage the stepper highlights: the stage of the visit's highest card. */
export function activeStageOf(currentCardName: string | null): LabourStage {
  const stage = currentCardName ? findCard(currentCardName)?.stage : undefined;
  return stage ? labourStageOf(stage) : 'stage1';
}

/**
 * The card the Timeline opens scrolled to (plan: "FlatList opened scrolled to the due card"; Android's
 * reversed list opens at the newest): the due card, else the newest card that is not upcoming. Null when
 * there is none, e.g. an empty list.
 */
export function scrollTargetId(checkpoints: readonly TimelineCheckpoint[]): string | null {
  const due = checkpoints.find((checkpoint) => checkpoint.status === 'dueNow');
  if (due) return due.id;
  const shown = checkpoints.filter((checkpoint) => checkpoint.status !== 'upcoming');
  return shown.at(-1)?.id ?? null;
}

/**
 * Which End Stage the button does (Android `manageEndStageButtonText`): Stage 1 or 2 from the current card's
 * stage. Null otherwise (no Stage 1/2 card; Stage 3's End Third Stage is not built), where a tap does nothing,
 * as Android's stage 0 — never treated as Stage 1 (audit H1).
 */
export function endStageOf(currentCardName: string | null): 'stage1' | 'stage2' | null {
  const stage = currentCardName ? findCard(currentCardName)?.stage : undefined;
  if (stage === STAGE.STAGE1) return 'stage1';
  if (stage === STAGE.STAGE2) return 'stage2';
  return null;
}

/** What a completed visit's Timeline shows in place of the action bar (Android `setVisitOutcome`). */
export interface OutcomeView {
  /** "Mother Outcome: X" for a plain outcome, "Outcome: X" when a reason or comment follows. */
  kind: 'mother' | 'outcome';
  outcome: string;
  /** The comment and/or the mother's death reason, joined by "/" (Android `updateOutOfTimeOutcomeText`). */
  reason: string | null;
  /** "View more": Android's dialog content (`showContentDialog`), null when there is nothing more. */
  more: { otherComment: string | null; motherDeceasedReason: string | null } | null;
}

export function outcomeView(summary: VisitOutcomeSummary | null): OutcomeView | null {
  if (!summary || summary.outcome === '') return null;
  const { otherComment, motherDeceasedReason } = summary;
  if (otherComment === null && motherDeceasedReason === null) {
    return { kind: 'mother', outcome: summary.outcome, reason: null, more: null };
  }
  const reason = otherComment !== null ? otherComment + (motherDeceasedReason !== null ? `/${motherDeceasedReason}` : '') : motherDeceasedReason;
  return { kind: 'outcome', outcome: summary.outcome, reason, more: { otherComment, motherDeceasedReason } };
}

/** First, middle and last name joined, skipping blanks. */
export function fullName(row: PatientRow): string {
  return [row.firstName, row.middleName, row.lastName].filter((part) => part && part.trim()).join(' ');
}
