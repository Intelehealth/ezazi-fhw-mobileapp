import { DECISION_PENDING_SET, decideNextStep, getCardStatus, getUpcomingStep } from '@ezazi/clinical-rules';

import { writeCard } from '@/core/db/card';
import { encounterTypeName, encounterTypeUuid } from '@/core/db/constants/encounter';
import { DECISION_PENDING } from '@/core/db/constants/visit';
import { encounterRepo, obsRepo, visitAttributeRepo, visitRepo } from '@/core/db/repositories';
import { transact, type DbHandle } from '@/core/db/tx';
import type { WriterIdentity } from '@/core/session/writerIdentity';
import { logger } from '@/core/utils/logger';

export interface ScanResult {
  cardsCreated: number;
  decisionPendingSet: number;
  missedMarkers: number;
  preSyncDue: number; // a card is one minute away; the sync engine will act on it later
  duplicatesSkipped: number;
  nextDueAt: number | null; // epoch ms the earliest next card or Decision Pending falls due; null: none coming
}

const emptyResult = (): ScanResult => ({
  cardsCreated: 0,
  decisionPendingSet: 0,
  missedMarkers: 0,
  preSyncDue: 0,
  duplicatesSkipped: 0,
  nextDueAt: null,
});

const earliest = (a: number | null, b: number | null): number | null =>
  a === null ? b : b === null ? a : Math.min(a, b);

/**
 * When the visit's next card (or Decision Pending) falls due, from the same latest card the scan reads.
 * Null once Decision Pending is set after the stage's last card, as Android's `nextDueDelayMillis`:
 * otherwise the alarm would be set for a moment that is always already past.
 */
export function nextDueAtForVisit(visitUuid: string, on: DbHandle): number | null {
  const latest = encounterRepo.findLatestClinicalByVisit(visitUuid, on);
  const name = latest?.encounter_type_uuid ? encounterTypeName(latest.encounter_type_uuid) : null;
  if (!latest || !name || !latest.encounter_time) return null;
  const upcoming = getUpcomingStep({ name, encounterTime: latest.encounter_time });
  if (!upcoming) return null;
  if (
    upcoming.kind === 'decisionPending' &&
    visitAttributeRepo.findValue(visitUuid, DECISION_PENDING, on) === DECISION_PENDING_SET
  ) {
    return null;
  }
  return upcoming.dueAt;
}

// Android writes the missed marker while drawing the timeline; here the engine does (decided 2026-10-23).
function writeMissedMarkers(visitUuid: string, identity: WriterIdentity, on: DbHandle): number {
  const cards = encounterRepo.findTimelineByVisit(visitUuid, on);
  const decisionPending = visitAttributeRepo.findValue(visitUuid, DECISION_PENDING, on) === DECISION_PENDING_SET;
  let written = 0;

  cards.forEach((card, index) => {
    const hasRealObs = obsRepo.hasRealObs(card.uuid, on);
    const status = getCardStatus(
      { isNewest: index === cards.length - 1, hasRealObs, hasMissedMarker: !hasRealObs && obsRepo.hasDataObs(card.uuid, on) },
      { decisionPending, visitComplete: false, isVisitHolder: true },
    );
    if (!status.writeMissedMarker) return;
    obsRepo.insertMissedEncounterMarker(
      { encounterUuid: card.uuid, creator: identity.creatorUuid, creatorUuid: identity.creatorUuid },
      on,
    );
    written += 1;
  });
  return written;
}

/** One visit, one transaction: the next card or Decision Pending, then any missed markers now due. */
export function scanVisit(visitUuid: string, identity: WriterIdentity, now: number, on: DbHandle): ScanResult {
  return transact((tx) => {
    const result = emptyResult();
    const latest = encounterRepo.findLatestClinicalByVisit(visitUuid, tx);
    const name = latest?.encounter_type_uuid ? encounterTypeName(latest.encounter_type_uuid) : null;

    if (latest && name && latest.encounter_time) {
      const step = decideNextStep({ name, encounterTime: latest.encounter_time }, now);
      const typeUuid = step.kind === 'createCard' ? encounterTypeUuid(step.card.name) : null;
      // Android's isEncounterAlreadyAvailable (added after b3ddd15): never a second card of the same name.
      // Voided rows do not count, unlike Android, where a voided card blocks the visit for good.
      if (step.kind === 'createCard' && typeUuid && encounterRepo.findUuidByVisitAndType(visitUuid, typeUuid, tx)) {
        logger.warn('[cardGeneration] card already exists, not written again', visitUuid, step.card.name);
        result.duplicatesSkipped += 1;
      } else if (step.kind === 'createCard') {
        writeCard(
          {
            visitUuid,
            cardName: step.card.name,
            encounterTime: step.encounterTime,
            privacyNoticeValue: step.privacyNoticeValue,
            marker: step.marker,
          },
          identity,
          tx,
        );
        result.cardsCreated += 1;
      } else if (step.kind === 'markDecisionPending') {
        if (visitAttributeRepo.upsertLocal(visitUuid, DECISION_PENDING, step.value, tx) !== null) {
          visitRepo.markDirty(visitUuid, tx);
          result.decisionPendingSet += 1;
        }
      } else if (step.kind === 'preSync') {
        result.preSyncDue += 1;
      }
    }

    result.missedMarkers = writeMissedMarkers(visitUuid, identity, tx);
    result.nextDueAt = nextDueAtForVisit(visitUuid, tx);
    return result;
  }, on);
}

/**
 * Every open visit the provider holds, as Android's minute scan (`CardGenerationEngine`). A visit
 * that fails is logged and skipped, so the others still get their cards. Deviation: in Android
 * one failure aborts the whole tick (decided 2026-10-27, Kaveri).
 */
export function scanAllVisits(identity: WriterIdentity, now: number, on: DbHandle): ScanResult {
  return visitRepo.findActiveVisitsByProvider(identity.providerUuid, on).reduce((total, visit) => {
    let one: ScanResult;
    try {
      one = scanVisit(visit.uuid, identity, now, on);
    } catch (error: unknown) {
      logger.error('[cardGeneration] visit scan failed', visit.uuid, error);
      // Still part of the next wake-up, so a visit that failed is tried again when its card is due.
      let dueAt: number | null = null;
      try {
        dueAt = nextDueAtForVisit(visit.uuid, on);
      } catch (readError: unknown) {
        logger.error('[cardGeneration] next due time unreadable', visit.uuid, readError);
      }
      return { ...total, nextDueAt: earliest(total.nextDueAt, dueAt) };
    }
    return {
      cardsCreated: total.cardsCreated + one.cardsCreated,
      decisionPendingSet: total.decisionPendingSet + one.decisionPendingSet,
      missedMarkers: total.missedMarkers + one.missedMarkers,
      preSyncDue: total.preSyncDue + one.preSyncDue,
      duplicatesSkipped: total.duplicatesSkipped + one.duplicatesSkipped,
      nextDueAt: earliest(total.nextDueAt, one.nextDueAt),
    };
  }, emptyResult());
}
