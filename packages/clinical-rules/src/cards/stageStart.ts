import { assertEpochMs, formatUtcTimestamp } from '../time/utcTimestamp';
import { getFirstCard } from './schedule';
import type { MonitoringStage, StageStart } from './types';
import { DECISION_PENDING_CLEARED, NORMAL_CARD_MARKER, PRIVACY_NOTICE_VALUE, STAGE } from '../constants';

/**
 * What starting a stage writes. Stage 1: admission (`AdmissionWriter`, or Nepal's
 * `PatientDetailActivity`), only for a new visit. Stage 2: "End Stage 1". Decision Pending
 * 'false'. Both first cards get the NORMAL marker; Android writes none on Stage 1's, so here
 * it is marked like the timer cards (decided 2026-10-27, Kaveri). Stage 2's alone gets the
 * privacy notice value, as in Android.
 */
export function getStageStart(stage: MonitoringStage, now: number): StageStart {
  assertEpochMs(now);

  return {
    stage,
    card: getFirstCard(stage),
    encounterTime: formatUtcTimestamp(now),
    marker: NORMAL_CARD_MARKER,
    privacyNoticeValue: stage === STAGE.STAGE1 ? null : PRIVACY_NOTICE_VALUE,
    decisionPending: DECISION_PENDING_CLEARED,
  };
}
