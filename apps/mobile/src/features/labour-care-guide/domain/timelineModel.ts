import { STAGE, findCard, getCardStatus, getUpcomingStep } from '@ezazi/clinical-rules';
import type { CardState, StageId, TimelineVisitFacts } from '@ezazi/clinical-rules';

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

/** The stage the stepper highlights: the stage of the visit's highest card. */
export function activeStageOf(currentCardName: string | null): LabourStage {
  const stage = currentCardName ? findCard(currentCardName)?.stage : undefined;
  return stage ? labourStageOf(stage) : 'stage1';
}

/** First, middle and last name joined, skipping blanks. */
export function fullName(row: PatientRow): string {
  return [row.firstName, row.middleName, row.lastName].filter((part) => part && part.trim()).join(' ');
}
