/**
 * Wire shapes of the portal service's `/openmrs/*` visit endpoints
 * (elcg-backend-service portal/src/modules/openmrs/openmrs.dto.ts). The
 * portal returns the raw OpenMRS visit tree in OpenMRS's own snake_case —
 * the same JSON the legacy portal served the Angular dashboard — so these
 * mirror that tree rather than a camelCase view of it. Dates arrive as ISO
 * strings. Nested objects are typed nullable wherever a LEFT JOIN can leave
 * them empty, so the mapper is forced to handle a partial record.
 */

export interface PortalPersonName {
  given_name: string | null;
  family_name: string | null;
}

export interface PortalConceptName {
  name: string;
  voided: boolean;
}

export interface PortalObs {
  value_text: string | null;
  value_numeric: number | null;
  /** LCG alert flag — 'R' (red) or 'Y' (yellow) on an out-of-range reading. */
  comments: string | null;
  uuid: string;
  voided: boolean;
  concept: { uuid: string; concept_name: PortalConceptName[] } | null;
}

export interface PortalEncounterProvider {
  uuid: string;
  voided: boolean;
  provider: {
    identifier: string | null;
    uuid: string;
    person: {
      gender: string | null;
      person_name: PortalPersonName | null;
    } | null;
  } | null;
}

export interface PortalEncounter {
  encounter_datetime: string;
  uuid: string;
  voided: boolean;
  obs: PortalObs[];
  type: { name: string } | null;
  encounter_provider: PortalEncounterProvider | null;
}

export interface PortalVisitAttribute {
  value_reference: string | null;
  uuid: string;
  voided: boolean;
  attribute_type: { name: string; uuid: string } | null;
}

/** One visit of a visit-list response. */
export interface PortalVisit {
  visit_id: number;
  uuid: string;
  date_started: string;
  date_stopped: string | null;
  voided: boolean;
  encounters: PortalEncounter[];
  patient: { identifier: string } | null;
  patient_name: PortalPersonName | null;
  person: {
    uuid: string;
    gender: string | null;
    birthdate: string | null;
  } | null;
  attributes: PortalVisitAttribute[];
}

/** GET /openmrs/get{Priority,InProgress,Completed}Visits */
export interface VisitListResponse {
  /** Visits on this page. */
  count: number;
  /** Visits in the whole section, across all pages. */
  totalCount: number;
  data: PortalVisit[];
  success: true;
}

export interface VisitListParams {
  page: number;
  limit: number;
  /** Only visits at this location; omitted = every facility. */
  facilityUuid?: string;
}

/** One row of GET /openmrs/getVisitCounts. `Status` is null for visits in no known bucket. */
export interface VisitCountRow {
  Total: number;
  Status:
    | 'Completed Visit'
    | 'Visit In Progress'
    | 'Priority'
    | 'Awaiting Consult'
    | null;
}

/** GET /openmrs/getVisitCounts */
export interface VisitCountResponse {
  data: VisitCountRow[];
  message: string;
}

/*
 * The visit as the OpenMRS REST API returns it directly — camelCase, unlike
 * the portal's snake_case tree above — for the WHO Labour Care Guide screen
 * (partogram.component.ts loads it with VisitService.fetchVisitDetails).
 */

export interface OpenMrsConceptRef {
  uuid: string;
  display: string;
}

/** A coded value arrives as its answer concept; text and numbers as themselves. */
export type OpenMrsValue =
  string | number | boolean | { uuid?: string; display: string } | null;

export interface OpenMrsVisitObs {
  uuid: string;
  display: string;
  value: OpenMrsValue;
  /** LCG alert flag — 'R' (red) or 'Y' (yellow) on an out-of-range reading. */
  comment: string | null;
  obsDatetime: string;
  concept: OpenMrsConceptRef;
  creator: {
    uuid: string;
    person: { uuid: string; display: string } | null;
  } | null;
}

export interface OpenMrsEncounterProvider {
  display: string;
  provider: {
    uuid: string;
    person: { uuid: string; display: string } | null;
  } | null;
}

export interface OpenMrsVisitEncounter {
  uuid: string;
  /** e.g. "Stage1_Hour2_1 02/11/2026" — names the stage, hour and slot. */
  display: string;
  encounterDatetime: string;
  encounterType: { display: string };
  obs: OpenMrsVisitObs[];
  encounterProviders: OpenMrsEncounterProvider[];
}

export interface OpenMrsAttribute {
  uuid: string;
  value: OpenMrsValue;
  attributeType: { uuid?: string; display: string };
}

/** GET {OPENMRS_URL}/visit/{uuid}?v=custom:(…) */
export interface OpenMrsVisitDetail {
  uuid: string;
  display: string;
  startDatetime: string;
  stopDatetime: string | null;
  location: { display: string } | null;
  encounters: OpenMrsVisitEncounter[];
  patient: {
    uuid: string;
    identifiers: { identifier: string }[];
    attributes: OpenMrsAttribute[];
    person: {
      display: string;
      gender: string;
      age: number | null;
      birthdate: string | null;
    };
  };
  attributes: OpenMrsAttribute[];
}

/** POST {OPENMRS_URL}/visit/{uuid}/attribute[/{attributeUuid}] */
export interface VisitAttributePayload {
  attributeType: string;
  value: string;
}
