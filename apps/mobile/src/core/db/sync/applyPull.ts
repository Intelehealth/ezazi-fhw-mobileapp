import {
  appStateRepo,
  encounterRepo,
  locationRepo,
  obsRepo,
  patientRepo,
  providerAttributeRepo,
  providerRepo,
  visitAttributeRepo,
  visitRepo,
} from '@/core/db/repositories';
import { transact, type DbHandle } from '@/core/db/tx';
import { logger } from '@/core/utils/logger';

/**
 * Applies one parsed pull response. ONE transaction: every table lands, or
 * none does, and the cursor commits with the rows it describes. Committed
 * apart, a crash leaves the cursor ahead of the data and those records are
 * skipped forever — the legacy's bug, made unrepresentable here.
 */

// ── the wire, named as the server names it ────────────────────────────────

export interface PulledPatient {
  uuid: string;
  openmrs_id?: string | null;
  firstname?: string | null;
  middlename?: string | null;
  lastname?: string | null;
  dateofbirth?: string | null;
  phonenumber?: string | null;
  address1?: string | null;
  address2?: string | null;
  cityvillage?: string | null;
  stateprovince?: string | null;
  postalcode?: string | null;
  country?: string | null;
  education?: string | null;
  economic?: string | null;
  gender?: string | null;
  /** camelCase, alone among these. The Java field beside it is `createdAt`. */
  dateCreated?: string | null;
  creatoruuid?: string | null;
  dead?: string | null;
}

export interface PulledPatientAttribute {
  uuid: string;
  patientuuid: string;
  person_attribute_type_uuid: string;
  value: string;
}

export interface PulledAttributeType {
  uuid: string;
  name: string;
}

export interface PulledVisit {
  uuid: string;
  patientuuid?: string | null;
  visit_type_uuid?: string | null;
  startdate?: string | null;
  enddate?: string | null;
  locationuuid?: string | null;
  creator_uuid?: string | null;
  modified_date?: string | null;
}

export interface PulledEncounter {
  uuid: string;
  visituuid?: string | null;
  encounter_type_uuid?: string | null;
  encounter_time?: string | null;
  provider_uuid?: string | null;
  privacynotice_value?: string | null;
  voided?: number;
}

export interface PulledObs {
  uuid: string;
  encounteruuid?: string | null;
  conceptuuid?: string | null;
  value?: string | null;
  comment?: string | null;
  creator?: string | null;
  creatoruuid?: string | null;
  obsServerModifiedDate?: string | null;
  /** The server's name for what we store as `created_date`. */
  obsDatetime?: string | null;
  voided?: number;
}

export interface PulledLocation {
  locationuuid: string;
  name?: string | null;
  retired?: number | null;
}

/** All 14 keys a real `providerlist` carries. `imagePath` is NOT among them. */
export interface PulledProvider {
  uuid: string;
  identifier?: string | null;
  given_name?: string | null;
  middle_name?: string | null;
  family_name?: string | null;
  gender?: string | null;
  dateofbirth?: string | null;
  emailId?: string | null;
  telephoneNumber?: string | null;
  countryCode?: string | null;
  role?: string | null;
  useruuid?: string | null;
  providerId?: string | null;
  voided?: number;
}

export interface PulledProviderAttributeRow {
  uuid: string;
  provideruuid: string;
  attributetypeuuid: string;
  value: string | null;
  voided: number;
}

export interface PulledVisitAttributeRow {
  uuid: string;
  visit_uuid: string;
  visit_attribute_type_uuid: string;
  value: string | null;
  voided: number;
}

/**
 * ONE PAGE of a pull, already unwrapped. The wire sends `{ status, data }` and
 * this is the `data`. Hand in the envelope and every list reads as absent.
 */
export interface PullPayload {
  /** The watermark the NEXT pull asks from. The server's clock, not ours. */
  pullexecutedtime?: string | null;
  /** The NEXT page to ask for. `-1` means this was the last one. */
  pageNo?: number;
  /** Carried by every page. The legacy reads it into a local and never uses it. */
  totalCount?: number;
  patientlist?: PulledPatient[];
  patientAttributeTypeListMaster?: PulledAttributeType[];
  patientAttributesList?: PulledPatientAttribute[];
  visitlist?: PulledVisit[];
  encounterlist?: PulledEncounter[];
  obslist?: PulledObs[];
  locationlist?: PulledLocation[];
  providerlist?: PulledProvider[];
  providerAttributeList?: PulledProviderAttributeRow[];
  visitAttributeList?: PulledVisitAttributeRow[];
}

/**
 * Carried by the response, mapped to no table, dropped on purpose. The legacy
 * does not model them either — `providerAttributeTypeList` is `List<Object>`
 * there. Listed so a reader knows this is a decision, not an oversight.
 */
const IGNORED_KEYS = [
  'providerAttributeTypeList',
  'visitAttributeTypeList',
  // A 16th key in the legacy's response model that nothing anywhere reads.
  'propertyContents',
] as const;

/** Pagination control, read by the driver. Not data, so applyPull ignores them. */
const CONTROL_KEYS = ['pageNo', 'totalCount'] as const;

/**
 * The ten lists this file writes. Exported because the archive reader routes
 * zip entries by filename onto these keys, and a second copy of the list that
 * drifted from this one would drop a whole table without saying so.
 */
export const PULL_LIST_KEYS = [
  'patientlist',
  'patientAttributeTypeListMaster',
  'patientAttributesList',
  'visitlist',
  'encounterlist',
  'obslist',
  'locationlist',
  'providerlist',
  'providerAttributeList',
  'visitAttributeList',
] as const;

const KNOWN_KEYS: readonly string[] = [
  'pullexecutedtime',
  ...PULL_LIST_KEYS,
  ...IGNORED_KEYS,
  ...CONTROL_KEYS,
];

export interface ApplyResult {
  patients: number;
  patientAttributes: number;
  attributeTypes: number;
  visits: number;
  encounters: number;
  observations: number;
  locations: number;
  providers: number;
  providerAttributes: number;
  visitAttributes: number;
  /** Null when the response carried no watermark, which leaves the cursor put. */
  cursor: string | null;
}

/**
 * Parents before children, in one transaction. The CURSOR IS A PARAMETER, never
 * `payload.pullexecutedtime`: every page of a run carries that value, so a page
 * reading it itself would commit the END of the run after page 0 and skip the
 * rest forever. Only the caller knows which page is last — pass `null` for all
 * the others. `pullAllPages` does this; prefer it over calling this directly.
 */
export function applyPull(
  payload: PullPayload,
  cursor: string | null,
  on?: DbHandle,
): ApplyResult {
  warnOnUnknownKeys(payload);

  const patients = payload.patientlist ?? [];
  const attributeTypes = payload.patientAttributeTypeListMaster ?? [];
  const patientAttributes = payload.patientAttributesList ?? [];
  const locations = payload.locationlist ?? [];
  const providers = payload.providerlist ?? [];
  const providerAttributes = payload.providerAttributeList ?? [];
  const visits = payload.visitlist ?? [];
  const encounters = payload.encounterlist ?? [];
  const observations = payload.obslist ?? [];
  const visitAttributes = payload.visitAttributeList ?? [];

  return transact((tx) => {
    patientRepo.upsertPatients(patients.map(toPatientRow), tx);
    patientRepo.upsertAttributeTypes(attributeTypes, tx);
    patientRepo.upsertPatientAttributesFromServer(patientAttributes, tx);

    // Locations before visits, providers before encounters — the legacy has
    // these the other way round and gets away with it only by luck.
    locationRepo.replaceAllFromPull(locations.map(toLocationRow), tx);
    providerRepo.upsertMany(providers.map(toProviderRow), tx);
    providerAttributeRepo.upsertManyFromPull(providerAttributes, tx);

    visitRepo.upsertManyFromServer(visits.map(toVisitRow), tx);
    encounterRepo.upsertMany(encounters.map(toEncounterRow), tx);
    obsRepo.upsertManyFromServer(observations.map(toObsRow), tx);
    // Whitelisted by type, so the written count is NOT the input count.
    const pulledVisitAttributes = visitAttributeRepo.upsertManyFromPull(visitAttributes, tx);
    warnOnSkippedTypes(pulledVisitAttributes.skipped);

    // Last, and inside the same transaction. This is the whole point.
    if (cursor) appStateRepo.setPullCursor(cursor, tx);

    return {
      patients: patients.length,
      patientAttributes: patientAttributes.length,
      attributeTypes: attributeTypes.length,
      visits: visits.length,
      encounters: encounters.length,
      observations: observations.length,
      locations: locations.length,
      providers: providers.length,
      providerAttributes: providerAttributes.length,
      visitAttributes: pulledVisitAttributes.written,
      cursor,
    };
  }, on);
}

/** A key we do not know is data we are silently dropping. Say so once. */
function warnOnUnknownKeys(payload: PullPayload): void {
  const unknown = Object.keys(payload).filter((key) => !KNOWN_KEYS.includes(key));
  if (unknown.length > 0) logger.warn('[sync] pull response had unknown keys', unknown);
}

/** Deduped: one unknown type across 300 rows is one line, not 300. */
function warnOnSkippedTypes(skipped: string[]): void {
  if (skipped.length === 0) return;
  logger.warn('[sync] pull skipped visit attribute types', [...new Set(skipped)]);
}

// ── wire → column. Only the names that differ are interesting. ─────────────

function toPatientRow(row: PulledPatient) {
  return {
    uuid: row.uuid,
    openmrs_id: row.openmrs_id ?? null,
    first_name: row.firstname ?? null,
    middle_name: row.middlename ?? null,
    last_name: row.lastname ?? null,
    date_of_birth: row.dateofbirth ?? null,
    phone_number: row.phonenumber ?? null,
    address1: row.address1 ?? null,
    address2: row.address2 ?? null,
    city_village: row.cityvillage ?? null,
    state_province: row.stateprovince ?? null,
    postal_code: row.postalcode ?? null,
    country: row.country ?? null,
    education_status: row.education ?? null,
    economic_status: row.economic ?? null,
    gender: row.gender ?? null,
    // The list reads order by this. Our edit path never sets it, so a pulled
    // patient that does not take it here stays NULL for good.
    dateCreated: row.dateCreated ?? null,
    creatoruuid: row.creatoruuid ?? null,
    dead: row.dead ?? null,
  };
}

function toVisitRow(row: PulledVisit) {
  return {
    uuid: row.uuid,
    patientuuid: row.patientuuid ?? null,
    visit_type_uuid: row.visit_type_uuid ?? null,
    startdate: row.startdate ?? null,
    enddate: row.enddate ?? null,
    locationuuid: row.locationuuid ?? null,
    creator: row.creator_uuid ?? null,
    modified_date: row.modified_date ?? null,
  };
}

function toEncounterRow(row: PulledEncounter) {
  return {
    uuid: row.uuid,
    visituuid: row.visituuid ?? null,
    encounter_type_uuid: row.encounter_type_uuid ?? null,
    encounter_time: row.encounter_time ?? null,
    provider_uuid: row.provider_uuid ?? null,
    privacynotice_value: row.privacynotice_value ?? null,
    voided: row.voided ?? 0,
  };
}

function toObsRow(row: PulledObs) {
  return {
    uuid: row.uuid,
    encounteruuid: row.encounteruuid ?? null,
    conceptuuid: row.conceptuuid ?? null,
    value: row.value ?? null,
    comment: row.comment ?? null,
    creator: row.creator ?? null,
    creatoruuid: row.creatoruuid ?? null,
    obsservermodifieddate: row.obsServerModifiedDate ?? null,
    created_date: row.obsDatetime ?? null,
    voided: row.voided ?? 0,
  };
}

function toLocationRow(row: PulledLocation) {
  return {
    locationuuid: row.locationuuid,
    name: row.name ?? null,
    retired: row.retired ?? null,
  };
}

// Every name below is identical on the wire and in the column, deliberately:
// the mapping is the place these drift, so there is nothing here to get wrong.
function toProviderRow(row: PulledProvider) {
  return {
    uuid: row.uuid,
    identifier: row.identifier ?? null,
    given_name: row.given_name ?? null,
    middle_name: row.middle_name ?? null,
    family_name: row.family_name ?? null,
    gender: row.gender ?? null,
    dateofbirth: row.dateofbirth ?? null,
    emailId: row.emailId ?? null,
    telephoneNumber: row.telephoneNumber ?? null,
    countryCode: row.countryCode ?? null,
    role: row.role ?? null,
    useruuid: row.useruuid ?? null,
    providerId: row.providerId ?? null,
    voided: row.voided ?? 0,
  };
}
