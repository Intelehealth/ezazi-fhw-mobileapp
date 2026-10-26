import { localIsoTimestamp } from '@/core/utils/datetime';

import { VISIT_TELEMEDICINE } from '../constants/visit';
import { patientRepo, visitAttributeRepo, visitRepo } from '../repositories';
import { VOIDED_NO } from '../syncFlags';
import type { DbHandle } from '../tx';
import { newUuid } from '../uuid';

/** What every dev seed takes: the logged-in provider (visit holder) and the clock. */
export interface DevSeedInput {
  providerUuid: string;
  now: number;
}

export interface DevPatient {
  readonly uuid: string;
  readonly openmrsId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly gender: string;
}

/**
 * A dev patient with one open visit started `at` (epoch ms) and its visit attributes, as
 * [type uuid, value] pairs. Pull-path writers, so the rows land sync-clean and are never pushed.
 */
export function writeDevPatientVisit(
  input: {
    patient: DevPatient;
    visitUuid: string;
    providerUuid: string;
    at: number;
    attributes: readonly (readonly [string, string])[];
  },
  on: DbHandle,
): void {
  const { patient, visitUuid, providerUuid, at } = input;

  patientRepo.upsertPatients(
    [
      {
        uuid: patient.uuid,
        openmrs_id: patient.openmrsId,
        first_name: patient.firstName,
        last_name: patient.lastName,
        date_of_birth: patient.dateOfBirth,
        gender: patient.gender,
        creatoruuid: providerUuid,
        dateCreated: localIsoTimestamp(at),
        voided: VOIDED_NO,
      },
    ],
    on,
  );

  visitRepo.upsertManyFromServer(
    [
      {
        uuid: visitUuid,
        patientuuid: patient.uuid,
        startdate: localIsoTimestamp(at),
        visit_type_uuid: VISIT_TELEMEDICINE,
        creator: providerUuid,
        voided: VOIDED_NO,
      },
    ],
    on,
  );

  visitAttributeRepo.upsertManyFromPull(
    input.attributes.map(([typeUuid, value]) => ({
      uuid: newUuid(),
      visit_uuid: visitUuid,
      visit_attribute_type_uuid: typeUuid,
      value,
      voided: VOIDED_NO,
    })),
    on,
  );
}
