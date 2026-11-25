import { STAGE, findCard, getCardLayout, getSosCardStage, getSosLayout } from '@ezazi/clinical-rules';
import type { CardLayout } from '@ezazi/clinical-rules';

import { utcTimestampToIso } from '@/core/utils/datetime';

import type { LabourStage } from './timeline.types';
import { labourStageOf } from './timelineModel';

/** The card a capture screen opens, as the data layer reads it. */
export interface CaptureCardRow {
  encounterUuid: string;
  cardName: string | null; // null for an SOS card or an unnamed type
  isSos: boolean;
  sosLabel: string | null; // SOS_STAGE_HOUR value, e.g. "Stage1_Hour2_SOS1"
  encounterTime: string; // stored UTC text
}

/** What the capture screen's title shows. */
export interface CaptureCardHeader {
  isSos: boolean;
  stage: LabourStage;
  scheduledAt: string; // ISO
}

/**
 * The title facts for one card: its stage (an SOS card's from its label, as Android's
 * `TimelineAdapter`) and time. Null when the stage or time cannot be read.
 */
export function toCaptureHeader(row: CaptureCardRow): CaptureCardHeader | null {
  const stage = row.isSos ? getSosCardStage(row.sosLabel) : row.cardName ? findCard(row.cardName)?.stage : null;
  const scheduledAt = utcTimestampToIso(row.encounterTime);
  if (!stage || !scheduledAt) return null;
  return { isSos: row.isSos, stage: labourStageOf(stage), scheduledAt };
}

/**
 * The fields a card shows: a regular card's by its name, an SOS card every field of its stage
 * (Android `HOURLY` with a non-NORMAL type). Null for cards the package has no layout for yet.
 */
export function toCaptureLayout(row: CaptureCardRow): CardLayout | null {
  if (!row.isSos) return row.cardName ? getCardLayout(row.cardName) : null;
  const stage = getSosCardStage(row.sosLabel);
  return stage === STAGE.STAGE1 || stage === STAGE.STAGE2 ? getSosLayout(stage) : null;
}
