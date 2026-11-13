import { encounterRepo, obsRepo, patientRepo, visitRepo } from '@/core/db/repositories';
import type { Encounter, Obs, Patient, PatientAttribute } from '@/core/db/schema';
import type { DbHandle } from '@/core/db/tx';

/**
 * Everything waiting to be sent, parents before children.
 *
 * Not a table-by-table sweep. The server takes ONE request carrying patients,
 * visits and encounters, with attributes and observations nested inside their
 * parent — so this returns that shape and the body builder only renames fields.
 */

export interface DirtyPatient {
  patient: Patient;
  /** EVERY attribute row, voided included — the server replaces the whole set. */
  attributes: PatientAttribute[];
}

export interface DirtyEncounter {
  encounter: Encounter;
  /** Image observations are excluded: they go up their own path. */
  observations: Obs[];
}

/** Visits arrive with their attributes already attached, via the declared relation. */
export type DirtyVisit = ReturnType<typeof visitRepo.findDirty>[number];

export interface DirtySet {
  patients: DirtyPatient[];
  visits: DirtyVisit[];
  encounters: DirtyEncounter[];
}

/**
 * Children are read THROUGH their parent, never swept table-wide. That is why
 * the dirty-parent rule exists: an observation under a clean encounter is not
 * reachable from here, so the write side has to wake the parent.
 */
export function collectDirty(on: DbHandle): DirtySet {
  const patients = patientRepo.listDirtyPatients(on).map((patient) => ({
    patient,
    attributes: patientRepo.listAttributes(patient.uuid, on),
  }));

  const encounters = encounterRepo.findUnsynced(on).map((encounter) => ({
    encounter,
    observations: obsRepo.listUnsyncedByEncounter(encounter.uuid, on),
  }));

  return { patients, visits: visitRepo.findDirty(on), encounters };
}

/** Nothing to send. The trigger layer uses this to not wake the network at all. */
export function isEmpty(set: DirtySet): boolean {
  return set.patients.length === 0 && set.visits.length === 0 && set.encounters.length === 0;
}
