import { assertEpochMs, formatUtcTimestamp } from '../time/utcTimestamp';
import { formatSosLabel, parseCardStageHour, parseSosLabel } from './sosLabel';
import type { SosDecision, SosRequest } from './types';

/**
 * The SOS tap, the same for Stages 1, 2 and 4 (`TimelineVisitSummaryActivity` 1440-1544,
 * button 1590-1596 / 1691). No limit on count. n = previous SOS's n + 1 when it has the
 * same stage and hour, else 1. Deviation: blocked during Decision Pending.
 */
export function decideSos(request: SosRequest, now: number): SosDecision {
  assertEpochMs(now);

  if (request.visitCompleted) return { kind: 'blocked', reason: 'visitCompleted' };
  if (!request.isVisitHolder) return { kind: 'blocked', reason: 'notVisitHolder' };
  if (request.decisionPending) return { kind: 'blocked', reason: 'decisionPending' };
  if (!request.latestCard) return { kind: 'blocked', reason: 'noLatestCard' };

  const current = parseCardStageHour(request.latestCard.name);
  if (!current) return { kind: 'blocked', reason: 'latestIsNotACard' };

  const previous = parseSosLabel(request.latestSosLabel);
  const sameSlot = previous !== null && previous.stage === current.stage && previous.hour === current.hour;
  const index = sameSlot ? previous.index + 1 : 1;

  return {
    kind: 'createSos',
    label: formatSosLabel({ stage: current.stage, hour: current.hour, index }),
    stage: current.stage,
    hour: current.hour,
    index,
    encounterTime: formatUtcTimestamp(now),
    providerUuid: request.latestCard.providerUuid,
    privacyNoticeValue: request.latestCard.privacyNoticeValue,
  };
}
