import { STAGE, getStageStart } from '@ezazi/clinical-rules';

import { VISIT_READ_STATUS_VALUE, VISIT_SPECIALITY_OBGYN } from '../constants/literals';
import { DECISION_PENDING, VISIT_DR_SPECIALITY, VISIT_HOLDER, VISIT_READ_STATUS } from '../constants/visit';
import { writeCard } from '../card';
import { encounterRepo, visitRepo } from '../repositories';
import type { DbHandle } from '../tx';
import { writeDevPatientVisit, type DevSeedInput } from './devPatientVisit';
import { DEV_LIVE_PATIENT, DEV_LIVE_VISIT_UUID } from './devVisitStart.data';

/**
 * The live test patient's dummy patient, open visit and visit attributes, standing in for
 * registration until it exists; written once, with no card. False when already present.
 * Pull-path writers, so these rows land sync-clean and are never pushed.
 */
export function seedDevLiveVisit(input: DevSeedInput, on: DbHandle): boolean {
  if (visitRepo.findPatientUuidByVisit(DEV_LIVE_VISIT_UUID, on)) return false;

  writeDevPatientVisit(
    {
      patient: DEV_LIVE_PATIENT,
      visitUuid: DEV_LIVE_VISIT_UUID,
      providerUuid: input.providerUuid,
      at: input.now,
      attributes: [
        [VISIT_DR_SPECIALITY, VISIT_SPECIALITY_OBGYN],
        [VISIT_HOLDER, input.providerUuid],
        [VISIT_READ_STATUS, VISIT_READ_STATUS_VALUE],
        [DECISION_PENDING, getStageStart(STAGE.STAGE1, input.now).decisionPending],
      ],
    },
    on,
  );
  return true;
}

/**
 * Starts Stage 1 on the live test visit (`AdmissionWriter.insertStageOneEncounter`):
 * `Stage1_Hour1_1` at now, unsynced, with the NORMAL marker Android leaves out (decided
 * 2026-10-27). Every later card comes from the card engine. `creatorUuid` is the logged-in
 * user, the marker's creator. False when the visit is missing or already has a card.
 */
export function startDevStage1(input: DevSeedInput & { creatorUuid: string }, on: DbHandle): boolean {
  if (!visitRepo.findPatientUuidByVisit(DEV_LIVE_VISIT_UUID, on)) return false;
  if (encounterRepo.findLatestClinicalByVisit(DEV_LIVE_VISIT_UUID, on)) return false;

  const start = getStageStart(STAGE.STAGE1, input.now);
  writeCard(
    {
      visitUuid: DEV_LIVE_VISIT_UUID,
      cardName: start.card.name,
      encounterTime: start.encounterTime,
      privacyNoticeValue: start.privacyNoticeValue,
      marker: start.marker,
    },
    input,
    on,
  );
  return true;
}
