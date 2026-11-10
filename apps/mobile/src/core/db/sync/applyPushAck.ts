import {
  encounterRepo,
  obsRepo,
  patientRepo,
  visitAttributeRepo,
  visitRepo,
} from '@/core/db/repositories';
import { SYNC_CLEAN } from '@/core/db/syncFlags';
import { transact, type DbHandle } from '@/core/db/tx';

import type { BuiltPush } from './buildPushBody';

/**
 * Applies the server's reply to a push. Per record, keyed by uuid — never
 * "the call returned 200, so everything worked". A row the server does not
 * accept, or does not mention at all, stays dirty and goes again next cycle.
 */

interface AckRow {
  uuid: string;
  syncd?: boolean | string | null;
}

export interface PushAckPayload {
  /** Read by the legacy and then ignored; kept so the shape is honest. */
  personList?: AckRow[];
  patientlist?: (AckRow & { openmrs_id?: string | null })[];
  visitlist?: AckRow[];
  encounterlist?: AckRow[];
}

export interface AckResult {
  patients: number;
  patientAttributes: number;
  visits: number;
  visitAttributes: number;
  encounters: number;
  observations: number;
  /** Named in the reply but not accepted. They stay dirty on purpose. */
  rejected: string[];
}

/** The wire sends a boolean, the legacy stringified it. Accept either. */
function accepted(row: AckRow): boolean {
  return row.syncd === true || row.syncd === 'true' || row.syncd === 'TRUE';
}

/**
 * `sent` is what `buildPushBody` returned. It carries the children that rode
 * with each parent, which the reply never names — without it an accepted
 * encounter's observations stay dirty and are sent on every later cycle.
 */
export function applyPushAck(
  ack: PushAckPayload,
  sent: BuiltPush,
  on?: DbHandle,
): AckResult {
  const rejected: string[] = [];
  const result: AckResult = {
    patients: 0,
    patientAttributes: 0,
    visits: 0,
    visitAttributes: 0,
    encounters: 0,
    observations: 0,
    rejected,
  };

  return transact((tx) => {
    for (const row of ack.patientlist ?? []) {
      if (!accepted(row)) {
        rejected.push(row.uuid);
        continue;
      }

      // The server mints the identifier; this is where we learn it.
      patientRepo.markPatientSynced(row.uuid, row.openmrs_id ?? null, SYNC_CLEAN, tx);
      result.patients += 1;

      const attributes = sent.attributesByPatient.get(row.uuid) ?? [];
      patientRepo.markAttributesSynced(attributes, tx);
      result.patientAttributes += attributes.length;
    }

    for (const row of ack.visitlist ?? []) {
      if (!accepted(row)) {
        rejected.push(row.uuid);
        continue;
      }

      visitRepo.markSynced(row.uuid, tx);
      result.visits += 1;

      // Visit attributes are addressed by their visit, not by their own uuids.
      visitAttributeRepo.markSynced(row.uuid, tx);
      result.visitAttributes += 1;
    }

    for (const row of ack.encounterlist ?? []) {
      if (!accepted(row)) {
        rejected.push(row.uuid);
        continue;
      }

      encounterRepo.markSynced(row.uuid, tx);
      result.encounters += 1;

      // Only the observations that actually went. One dropped for a null value
      // must not be marked sent on the back of its encounter.
      const observations = sent.observationsByEncounter.get(row.uuid) ?? [];
      obsRepo.markSynced(observations, tx);
      result.observations += observations.length;
    }

    return result;
  }, on);
}
