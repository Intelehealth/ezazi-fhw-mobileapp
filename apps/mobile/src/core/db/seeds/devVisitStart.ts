import { STAGE, getStageStart } from '@ezazi/clinical-rules';

import { localIsoTimestamp } from '@/core/utils/datetime';

import { encounterTypeUuid } from '../constants/encounter';
import { VISIT_READ_STATUS_VALUE, VISIT_SPECIALITY_OBGYN } from '../constants/literals';
import {
  DECISION_PENDING,
  VISIT_DR_SPECIALITY,
  VISIT_HOLDER,
  VISIT_READ_STATUS,
  VISIT_TELEMEDICINE,
} from '../constants/visit';
import { encounterRepo, patientRepo, visitAttributeRepo, visitRepo } from '../repositories';
import { SYNC_DIRTY, VOIDED_NO } from '../syncFlags';
import type { DbHandle } from '../tx';
import { newUuid } from '../uuid';
import { DEV_LIVE_PATIENT, DEV_LIVE_VISIT_UUID } from './devVisitStart.data';

export interface DevLiveVisitInput {
  providerUuid: string;
  now: number;
}

/**
 * The live test patient's dummy patient, open visit and visit attributes, standing in for
 * registration until it exists; written once, with no card. False when already present.
 * Pull-path writers, so these rows land sync-clean and are never pushed.
 */
export function seedDevLiveVisit(input: DevLiveVisitInput, on: DbHandle): boolean {
  if (visitRepo.findPatientUuidByVisit(DEV_LIVE_VISIT_UUID, on)) return false;

  patientRepo.upsertPatients(
    [
      {
        uuid: DEV_LIVE_PATIENT.uuid,
        openmrs_id: DEV_LIVE_PATIENT.openmrsId,
        first_name: DEV_LIVE_PATIENT.firstName,
        last_name: DEV_LIVE_PATIENT.lastName,
        date_of_birth: DEV_LIVE_PATIENT.dateOfBirth,
        gender: DEV_LIVE_PATIENT.gender,
        creatoruuid: input.providerUuid,
        dateCreated: localIsoTimestamp(input.now),
        voided: VOIDED_NO,
      },
    ],
    on,
  );

  visitRepo.upsertManyFromServer(
    [
      {
        uuid: DEV_LIVE_VISIT_UUID,
        patientuuid: DEV_LIVE_PATIENT.uuid,
        startdate: localIsoTimestamp(input.now),
        visit_type_uuid: VISIT_TELEMEDICINE,
        creator: input.providerUuid,
        voided: VOIDED_NO,
      },
    ],
    on,
  );

  visitAttributeRepo.upsertManyFromPull(
    [
      [VISIT_DR_SPECIALITY, VISIT_SPECIALITY_OBGYN],
      [VISIT_HOLDER, input.providerUuid],
      [VISIT_READ_STATUS, VISIT_READ_STATUS_VALUE],
      [DECISION_PENDING, getStageStart(STAGE.STAGE1, input.now).decisionPending],
    ].map(([typeUuid, value]) => ({
      uuid: newUuid(),
      visit_uuid: DEV_LIVE_VISIT_UUID,
      visit_attribute_type_uuid: typeUuid,
      value,
      voided: VOIDED_NO,
    })),
    on,
  );
  return true;
}

/**
 * Starts Stage 1 on the live test visit as Android does (`AdmissionWriter.insertStageOneEncounter`):
 * `Stage1_Hour1_1` at now, unsynced, no obs. Every later card comes from the card engine.
 * False when the visit is missing or already has a card.
 */
export function startDevStage1(input: DevLiveVisitInput, on: DbHandle): boolean {
  if (!visitRepo.findPatientUuidByVisit(DEV_LIVE_VISIT_UUID, on)) return false;
  if (encounterRepo.findLatestClinicalByVisit(DEV_LIVE_VISIT_UUID, on)) return false;

  const start = getStageStart(STAGE.STAGE1, input.now);
  const typeUuid = encounterTypeUuid(start.card.name);
  if (!typeUuid) throw new Error(`Dev visit: unknown card ${start.card.name}`);

  encounterRepo.insertManyReplacing(
    [
      {
        uuid: newUuid(),
        visituuid: DEV_LIVE_VISIT_UUID,
        encounter_time: start.encounterTime,
        provider_uuid: input.providerUuid,
        encounter_type_uuid: typeUuid,
        privacynotice_value: start.privacyNoticeValue,
        voided: VOIDED_NO,
        sync: SYNC_DIRTY,
      },
    ],
    on,
  );
  return true;
}
