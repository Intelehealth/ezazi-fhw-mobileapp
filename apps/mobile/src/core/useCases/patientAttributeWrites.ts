import { patientRepo } from '@/core/db/repositories';
import type { PatientAttributeInput } from '@/core/db/repositories/patient';
import { transact, type DbHandle } from '@/core/db/tx';

/**
 * Patient-attribute writes paired with the patient's needing-send flag, in ONE
 * transaction. The push collects attributes under their patient, and
 * `markPatientSynced` touches `tbl_patient` alone — so an attribute edited
 * beneath a clean patient is collected by nothing and never sent.
 */

export function recordPatientAttributes(rows: PatientAttributeInput[], on?: DbHandle): void {
  transact((tx) => {
    if (rows.length === 0) return;

    patientRepo.upsertPatientAttributes(rows, tx);

    for (const uuid of new Set(rows.map((row) => row.patientuuid).filter(Boolean) as string[])) {
      patientRepo.markDirty(uuid, tx);
    }
  }, on);
}

/** Named apart from `patientRepo.setPatientAttribute`, which it wraps. */
export function recordPatientAttribute(
  patientUuid: string,
  attributeTypeUuid: string,
  value: string,
  on?: DbHandle,
): void {
  transact((tx) => {
    patientRepo.setPatientAttribute(patientUuid, attributeTypeUuid, value, tx);
    patientRepo.markDirty(patientUuid, tx);
  }, on);
}
