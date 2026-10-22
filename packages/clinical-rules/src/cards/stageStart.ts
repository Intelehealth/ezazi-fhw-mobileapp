import { assertEpochMs, formatUtcTimestamp } from '../time/utcTimestamp';
import { getFirstCard } from './schedule';
import type { MonitoringStage, StageStart } from './types';
import { DECISION_PENDING_CLEARED, NORMAL_CARD_MARKER, PRIVACY_NOTICE_VALUE, STAGE } from '../constants';

/**
 * What starting a stage writes. Stage 1: admission (`AdmissionWriter`, or Nepal's
 * `PatientDetailActivity`), only for a new visit. Stage 2: "End Stage 1". Decision Pending
 * 'false'; Stage 2's first card alone gets the marker and privacy notice value.
 */
export function getStageStart(stage: MonitoringStage, now: number): StageStart {
  assertEpochMs(now);

  return {
    stage,
    card: getFirstCard(stage),
    encounterTime: formatUtcTimestamp(now),
    marker: stage === STAGE.STAGE1 ? null : NORMAL_CARD_MARKER,
    privacyNoticeValue: stage === STAGE.STAGE1 ? null : PRIVACY_NOTICE_VALUE,
    decisionPending: DECISION_PENDING_CLEARED,
  };
}
