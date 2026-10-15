import {
  assertEpochMs,
  formatUtcTimestamp,
  MS_PER_MINUTE,
  parseUtcTimestamp,
  wholeMinutesBetween,
} from '../time/utcTimestamp';
import { findCard, getNextCard } from './schedule';
import type { CardStep, LatestCard, UpcomingStep } from './types';
import { DECISION_PENDING_SET, NORMAL_CARD_MARKER, PRIVACY_NOTICE_VALUE } from '../constants';

/**
 * Android's 1-minute tick for one visit (`CardGenerationEngine` 111-146). Rolling, no
 * backfill. Repeats `markDecisionPending` on later ticks; the app skips it if already 'true'.
 */
export function decideNextStep(latest: LatestCard, now: number): CardStep {
  assertEpochMs(now);

  const card = findCard(latest.name);
  if (!card) return { kind: 'notMonitored' };

  const cardTime = parseUtcTimestamp(latest.encounterTime);
  if (cardTime === null) return { kind: 'invalidTime' };

  const dueAt = cardTime + card.intervalMinutes * MS_PER_MINUTE;
  const minutes = wholeMinutesBetween(cardTime, now);

  if (minutes >= card.intervalMinutes) {
    const next = getNextCard(card);
    if (!next) {
      return { kind: 'markDecisionPending', stage: card.stage, value: DECISION_PENDING_SET };
    }
    return {
      kind: 'createCard',
      card: next,
      encounterTime: formatUtcTimestamp(now),
      marker: NORMAL_CARD_MARKER,
      privacyNoticeValue: PRIVACY_NOTICE_VALUE,
    };
  }

  if (minutes === card.intervalMinutes - 1) return { kind: 'preSync', dueAt };
  return { kind: 'wait', dueAt };
}

/** When the next card, or Decision Pending, falls due. Null for a non-card or bad time. */
export function getUpcomingStep(latest: LatestCard): UpcomingStep | null {
  const card = findCard(latest.name);
  const cardTime = parseUtcTimestamp(latest.encounterTime);
  if (!card || cardTime === null) return null;

  const dueAt = cardTime + card.intervalMinutes * MS_PER_MINUTE;
  const next = getNextCard(card);
  return next
    ? { kind: 'card', card: next, dueAt }
    : { kind: 'decisionPending', stage: card.stage, dueAt };
}
