import { DECISION_PENDING_SET, decideNextStep, getCardStatus } from '@ezazi/clinical-rules';

import { writeCard } from '@/core/db/card';
import { encounterTypeName } from '@/core/db/constants/encounter';
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
}

const emptyResult = (): ScanResult => ({ cardsCreated: 0, decisionPendingSet: 0, missedMarkers: 0, preSyncDue: 0 });

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
      if (step.kind === 'createCard') {
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
      return total;
    }
    return {
      cardsCreated: total.cardsCreated + one.cardsCreated,
      decisionPendingSet: total.decisionPendingSet + one.decisionPendingSet,
      missedMarkers: total.missedMarkers + one.missedMarkers,
      preSyncDue: total.preSyncDue + one.preSyncDue,
    };
  }, emptyResult());
}
