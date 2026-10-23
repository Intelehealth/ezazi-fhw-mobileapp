import {
  DECISION_PENDING_CLEARED,
  NORMAL_CARD_MARKER,
  PRIVACY_NOTICE_VALUE,
  STAGE,
  formatSosName,
} from '@ezazi/clinical-rules';

import { localIsoTimestamp, utcIsoTimestamp } from '@/core/utils/datetime';

import { ENCOUNTER_ADMISSION, LCG_SOS, encounterTypeUuid } from '../constants/encounter';
import { MISSED_ENCOUNTER_VALUE, VISIT_READ_STATUS_VALUE } from '../constants/literals';
import { ENCOUNTER_TYPE, MISSED_ENCOUNTER, SOS_STAGE_HOUR } from '../constants/obs';
import {
  DECISION_PENDING,
  VISIT_HOLDER,
  VISIT_READ_STATUS,
  VISIT_TELEMEDICINE,
} from '../constants/visit';
import { encounterRepo, obsRepo, patientRepo, visitAttributeRepo, visitRepo } from '../repositories';
import type { NewEncounter } from '../repositories/encounter';
import type { ObsUpsert } from '../repositories/obs';
import { VOIDED_NO } from '../syncFlags';
import type { DbHandle } from '../tx';
import { newUuid } from '../uuid';
import {
  DEV_ADMISSION_VALUES,
  DEV_ADMITTED_MINUTES_AGO,
  DEV_CARDS,
  DEV_PATIENT,
  DEV_SOS,
  DEV_VISIT_UUID,
  MS_PER_MINUTE,
  type DevObs,
} from './devPatient.data';

export interface DevSeedInput {
  providerUuid: string;
  now: number;
}

/**
 * Writes the fake patient once; false when already present. Every row goes through
 * the pull-path writers, so it lands sync-clean and the sync engine never pushes it.
 */
export function seedDevPatient(input: DevSeedInput, on: DbHandle): boolean {
  if (visitRepo.findPatientUuidByVisit(DEV_VISIT_UUID, on)) return false;

  const at = (minutesAgo: number) => input.now - minutesAgo * MS_PER_MINUTE;
  const admittedAt = at(DEV_ADMITTED_MINUTES_AGO);

  patientRepo.upsertPatients(
    [
      {
        uuid: DEV_PATIENT.uuid,
        openmrs_id: DEV_PATIENT.openmrsId,
        first_name: DEV_PATIENT.firstName,
        last_name: DEV_PATIENT.lastName,
        date_of_birth: DEV_PATIENT.dateOfBirth,
        gender: DEV_PATIENT.gender,
        creatoruuid: input.providerUuid,
        dateCreated: localIsoTimestamp(admittedAt),
        voided: VOIDED_NO,
      },
    ],
    on,
  );

  visitRepo.upsertManyFromServer(
    [
      {
        uuid: DEV_VISIT_UUID,
        patientuuid: DEV_PATIENT.uuid,
        startdate: localIsoTimestamp(admittedAt),
        visit_type_uuid: VISIT_TELEMEDICINE,
        creator: input.providerUuid,
        voided: VOIDED_NO,
      },
    ],
    on,
  );

  visitAttributeRepo.upsertManyFromPull(
    [
      [VISIT_HOLDER, input.providerUuid],
      [VISIT_READ_STATUS, VISIT_READ_STATUS_VALUE],
      [DECISION_PENDING, DECISION_PENDING_CLEARED],
    ].map(([typeUuid, value]) => ({
      uuid: newUuid(),
      visit_uuid: DEV_VISIT_UUID,
      visit_attribute_type_uuid: typeUuid,
      value,
      voided: VOIDED_NO,
    })),
    on,
  );

  const encounters: NewEncounter[] = [];
  const observations: ObsUpsert[] = [];

  const addEncounter = (typeUuid: string, time: number, privacy: string | null): string => {
    const uuid = newUuid();
    encounters.push({
      uuid,
      visituuid: DEV_VISIT_UUID,
      encounter_time: utcIsoTimestamp(time),
      provider_uuid: input.providerUuid,
      encounter_type_uuid: typeUuid,
      privacynotice_value: privacy,
      voided: VOIDED_NO,
    });
    return uuid;
  };

  const addObs = (encounterUuid: string, time: number, obs: DevObs) => {
    observations.push({
      uuid: newUuid(),
      encounteruuid: encounterUuid,
      conceptuuid: obs.concept,
      value: obs.value,
      comment: obs.alert ?? '',
      creator: input.providerUuid,
      creatoruuid: input.providerUuid,
      created_date: utcIsoTimestamp(time),
      voided: VOIDED_NO,
    });
  };

  const admission = addEncounter(ENCOUNTER_ADMISSION, admittedAt, null);
  DEV_ADMISSION_VALUES.forEach((obs) => addObs(admission, admittedAt, obs));

  DEV_CARDS.forEach((card, position) => {
    const typeUuid = encounterTypeUuid(card.name);
    if (!typeUuid) throw new Error(`Dev seed: unknown card ${card.name}`);

    const time = at(card.minutesAgo);
    // Android writes the first card with no marker and no privacy value.
    const isFirst = position === 0;
    const uuid = addEncounter(typeUuid, time, isFirst ? null : PRIVACY_NOTICE_VALUE);
    if (!isFirst) addObs(uuid, time, { concept: ENCOUNTER_TYPE, value: NORMAL_CARD_MARKER });
    if (card.missed) addObs(uuid, time, { concept: MISSED_ENCOUNTER, value: MISSED_ENCOUNTER_VALUE });
    card.obs.forEach((obs) => addObs(uuid, time, obs));
  });

  const sosTime = at(DEV_SOS.minutesAgo);
  const sos = addEncounter(LCG_SOS, sosTime, PRIVACY_NOTICE_VALUE);
  addObs(sos, sosTime, {
    concept: SOS_STAGE_HOUR,
    value: formatSosName(STAGE.STAGE1, DEV_SOS.hour, DEV_SOS.index),
  });
  DEV_SOS.obs.forEach((obs) => addObs(sos, sosTime, obs));

  encounterRepo.upsertMany(encounters, on);
  obsRepo.upsertManyFromServer(observations, on);
  return true;
}
