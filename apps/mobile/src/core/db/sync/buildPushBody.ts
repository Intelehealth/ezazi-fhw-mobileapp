import { ENCOUNTER_EMERGENCY } from '@/core/db/constants/encounter';
import { PROVIDER_ENCOUNTER_ROLE } from '@/core/db/constants/provider';
import { OPENMRS_IDENTIFIER_TYPE } from '@/core/db/constants/wire';
import { visitRepo } from '@/core/db/repositories';
import type { DbHandle } from '@/core/db/tx';

import type { DirtySet } from './collectDirty';

/**
 * Turns the push queue into the body the server takes. NOT a mirror of our
 * tables: it is OpenMRS resource shapes — four arrays, with names, addresses
 * and attributes nested under a person, and observations under an encounter.
 */

/** The one value this cannot get from the database. Comes from the session. */
export interface PushContext {
  locationUuid: string;
}

interface PushName {
  givenName: string | null;
  middleName: string | null;
  familyName: string | null;
}

interface PushAddress {
  cityVillage: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  country: string | null;
}

interface PushAttribute {
  attributeType: string | null;
  value: string | null;
}

export interface PushPerson {
  uuid: string;
  birthdate: string | null;
  gender: string | null;
  names: PushName[];
  addresses: PushAddress[];
  attributes: PushAttribute[];
}

export interface PushPatient {
  /** The person's uuid, not a nested object — the legacy sends the id alone. */
  person: string;
  identifiers: { identifierType: string; location: string; preferred: boolean }[];
}

export interface PushVisit {
  uuid: string;
  patient: string | null;
  location: string | null;
  visitType: string | null;
  startDatetime: string | null;
  /** Omitted entirely while the visit is open — the legacy only sets it when closed. */
  stopDatetime?: string;
  attributes: PushAttribute[];
}

export interface PushObs {
  uuid: string;
  concept: string | null;
  value: string | null;
  comment: string | null;
  voided: number;
  createdDate: string | null;
}

export interface PushEncounter {
  uuid: string;
  encounterDatetime: string | null;
  encounterType: string | null;
  patient: string | null;
  visit: string | null;
  voided: number;
  location: string;
  encounterProviders: { encounterRole: string; provider: string | null }[];
  obs: PushObs[];
}

export interface PushBody {
  patients: PushPatient[];
  persons: PushPerson[];
  visits: PushVisit[];
  encounters: PushEncounter[];
}

export interface BuiltPush {
  body: PushBody;
  /**
   * Which observations rode with which encounter. The reply names encounters
   * only, so without this the ack cannot clear the right observation flags.
   */
  observationsByEncounter: Map<string, string[]>;
}

/**
 * `on` is needed for one lookup: an encounter carries a visit, and the body
 * wants the patient. Everything else comes from the set.
 */
export function buildPushBody(set: DirtySet, context: PushContext, on: DbHandle): BuiltPush {
  const persons = set.patients.map(({ patient, attributes }) => ({
    uuid: patient.uuid,
    birthdate: patient.date_of_birth,
    gender: patient.gender,
    names: [
      {
        givenName: patient.first_name,
        middleName: patient.middle_name,
        familyName: patient.last_name,
      },
    ],
    addresses: [
      {
        cityVillage: patient.city_village,
        stateProvince: patient.state_province,
        postalCode: patient.postal_code,
        country: patient.country,
      },
    ],
    attributes: attributes.map((row) => ({
      attributeType: row.person_attribute_type_uuid,
      value: row.value,
    })),
  }));

  // No identifier VALUE is sent: the server mints it and returns it, which is
  // what `markPatientSynced` stores as `openmrs_id`.
  const patients = set.patients.map(({ patient }) => ({
    person: patient.uuid,
    identifiers: [
      {
        identifierType: OPENMRS_IDENTIFIER_TYPE,
        location: context.locationUuid,
        preferred: true,
      },
    ],
  }));

  const visits = set.visits.map((row) => ({
    uuid: row.uuid,
    patient: row.patientuuid,
    location: row.locationuuid,
    visitType: row.visit_type_uuid,
    startDatetime: row.startdate,
    ...(row.enddate ? { stopDatetime: row.enddate } : {}),
    attributes: row.attributes.map((attribute) => ({
      attributeType: attribute.visit_attribute_type_uuid,
      value: attribute.value,
    })),
  }));

  const observationsByEncounter = new Map<string, string[]>();

  const encounters = set.encounters.map(({ encounter, observations }) => {
    // The legacy sends an EMERGENCY encounter with no obs at all.
    const sendable =
      encounter.encounter_type_uuid === ENCOUNTER_EMERGENCY
        ? []
        : observations.filter((entry) => entry.value !== null);

    observationsByEncounter.set(
      encounter.uuid,
      sendable.map((entry) => entry.uuid),
    );

    return {
      uuid: encounter.uuid,
      encounterDatetime: encounter.encounter_time,
      encounterType: encounter.encounter_type_uuid,
      patient: encounter.visituuid
        ? visitRepo.findPatientUuidByVisit(encounter.visituuid, on)
        : null,
      visit: encounter.visituuid,
      voided: encounter.voided,
      location: context.locationUuid,
      encounterProviders: [
        { encounterRole: PROVIDER_ENCOUNTER_ROLE, provider: encounter.provider_uuid },
      ],
      obs: sendable.map((entry) => ({
        uuid: entry.uuid,
        concept: entry.conceptuuid,
        value: entry.value,
        comment: entry.comment,
        voided: entry.voided,
        createdDate: entry.created_date,
      })),
    };
  });

  return { body: { patients, persons, visits, encounters }, observationsByEncounter };
}
