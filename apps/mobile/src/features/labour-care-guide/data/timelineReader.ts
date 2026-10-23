import { DECISION_PENDING_SET } from '@ezazi/clinical-rules';
import type { TimelineVisitFacts } from '@ezazi/clinical-rules';

import { LCG_SOS, encounterTypeName } from '@/core/db/constants/encounter';
import { ENCOUNTER_TYPE, MISSED_ENCOUNTER, OBS_GRAVIDA, SOS_STAGE_HOUR } from '@/core/db/constants/obs';
import { DECISION_PENDING } from '@/core/db/constants/visit';
import { encounterRepo, obsRepo, patientRepo, visitAttributeRepo, visitRepo } from '@/core/db/repositories';
import type { DbHandle } from '@/core/db/tx';

import type { PatientRow, TimelineCardRow } from '../domain/timelineModel';

/** Everything the timeline needs about one visit, read in one go. */
export interface TimelineSnapshot {
  patient: PatientRow | null;
  cards: TimelineCardRow[];
  visit: TimelineVisitFacts;
  currentCardName: string | null;
}

// Rows that describe the card rather than record an observation.
const NOT_OBSERVATIONS = new Set<string>([ENCOUNTER_TYPE, SOS_STAGE_HOUR, MISSED_ENCOUNTER]);

function readCard(row: { uuid: string; encounter_type_uuid: string | null; encounter_time: string | null }, on: DbHandle): TimelineCardRow {
  const hasRealObs = obsRepo.hasRealObs(row.uuid, on);
  const recorded = hasRealObs
    ? obsRepo
        .listByEncounter(row.uuid, on)
        .filter((obs) => obs.conceptuuid && !NOT_OBSERVATIONS.has(obs.conceptuuid) && obs.created_date)
        .map((obs) => obs.created_date as string)
        .sort()
        .at(-1) ?? null
    : null;

  return {
    encounterUuid: row.uuid,
    cardName: row.encounter_type_uuid ? encounterTypeName(row.encounter_type_uuid) : null,
    isSos: row.encounter_type_uuid === LCG_SOS,
    encounterTime: row.encounter_time ?? '',
    hasRealObs,
    hasMissedMarker: !hasRealObs && obsRepo.hasDataObs(row.uuid, on),
    recordedAt: recorded,
  };
}

/** The visit's patient, cards (oldest first) and open / holder / Decision Pending facts. */
export function readTimeline(visitUuid: string, providerUuid: string | null, on: DbHandle): TimelineSnapshot {
  const patientUuid = visitRepo.findPatientUuidByVisit(visitUuid, on);
  const header = patientUuid ? patientRepo.getPatientHeader(patientUuid, on) : null;

  return {
    patient:
      patientUuid && header
        ? {
            patientUuid,
            openmrsId: header.openmrs_id,
            firstName: header.first_name,
            middleName: header.middle_name,
            lastName: header.last_name,
            dateOfBirth: patientRepo.getDateOfBirth(patientUuid, on),
            gravida: obsRepo.getAdmissionValues(visitUuid, on)[OBS_GRAVIDA] ?? null,
          }
        : null,
    cards: encounterRepo.findTimelineByVisit(visitUuid, on).map((row) => readCard(row, on)),
    visit: {
      decisionPending: visitAttributeRepo.findValue(visitUuid, DECISION_PENDING, on) === DECISION_PENDING_SET,
      visitComplete: encounterRepo.findVisitCompleteUuid(visitUuid, on) !== null,
      isVisitHolder: providerUuid !== null && visitRepo.hasProviderAccess(visitUuid, providerUuid, on),
    },
    currentCardName: encounterRepo.findCurrentStageName(visitUuid, on),
  };
}
