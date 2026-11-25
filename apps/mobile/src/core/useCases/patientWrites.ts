import { patientRepo, imageRepo } from '@/core/db/repositories';
import type { PatientInput } from '@/core/db/repositories/patient';
import { transact, type DbHandle } from '@/core/db/tx';
import { newUuid } from '@/core/db/uuid';
import { logger } from '@/core/utils/logger';

/**
 * The one local write that creates a patient: the row, its attributes and its
 * profile-image record, in ONE transaction.
 *
 * Tripwire 10's parent-before-child rule, in its create form. `createPatient`
 * already writes the row SYNC_DIRTY, so unlike `patientAttributeWrites` this
 * needs no separate `markDirty` — the parent is born needing send, and the
 * push collects its attributes through it.
 *
 * ORDER IS LOAD-BEARING, and not only by convention. The legacy inserted the
 * attribute rows BEFORE the patient row they point at (`PatientsDAO` :126 then
 * :128), which is harmless today only because no foreign keys exist and
 * `PRAGMA foreign_keys` is off — turning FK enforcement on would make every
 * registration fail on the first attribute insert. Parent first, here.
 */

/**
 * An attribute to write, named rather than typed.
 *
 * The caller cannot resolve the type uuid itself: `getAttributeTypeUuid` reads
 * `tbl_patient_attribute_master`, which needs a handle, and the only handle
 * that belongs in the same transaction as the row is the `tx` this file opens.
 * So names come in and the lookup happens inside.
 */
export interface NamedAttribute {
  /** Exactly as `constants/patient.ts` spells it — the lookup matches on it. */
  name: string;
  value: string;
}

export interface CreatePatientInput {
  patientUuid: string;
  patient: PatientInput;
  attributes: NamedAttribute[];
  /** The on-disk path from `capturePhoto`, or null when no photo was taken. */
  photoPath: string | null;
}

export function createPatientWithAttributes(input: CreatePatientInput, on?: DbHandle): void {
  // The callback is deliberately synchronous — `transact` rejects an async one
  // at compile time, because a promise would commit before its work ran.
  transact((tx) => {
    patientRepo.createPatient(input.patientUuid, input.patient, tx);

    const rows = [];

    for (const attribute of input.attributes) {
      const typeUuid = patientRepo.getAttributeTypeUuid(attribute.name, tx);

      // A miss means the master table has not been pulled, or the name is
      // misspelled. SKIP rather than write, and never substitute '': the
      // legacy wrote the empty string and those rows resolve to nothing on
      // read-back while shipping an empty attribute type on push. Losing one
      // attribute is better than failing the registration the patient is the
      // point of — so this logs and carries on.
      if (typeUuid === null) {
        logger.error('[Registration] No attribute type for name, row skipped', attribute.name);
        continue;
      }

      rows.push({
        uuid: newUuid(),
        patientuuid: input.patientUuid,
        person_attribute_type_uuid: typeUuid,
        value: attribute.value,
      });
    }

    if (rows.length > 0) {
      patientRepo.upsertPatientAttributes(rows, tx);
    }

    // `updatePatientPhoto` deliberately does NOT mark the row dirty, which is
    // why the path rides on the row through `patient.patient_photo` and the
    // record goes here. Both land inside the same transaction as the row.
    if (input.photoPath !== null) {
      imageRepo.upsertProfileImage(
        { patientUuid: input.patientUuid, imagePath: input.photoPath },
        tx,
      );
    }
  }, on);
}
