import { and, eq, inArray } from 'drizzle-orm';

import { localIsoTimestamp, utcIsoTimestamp } from '@/core/utils/datetime';

import { IMAGE_TYPE_PROFILE } from '../constants/literals';
import { COMPLEX_IMAGE_AD, COMPLEX_IMAGE_PE } from '../constants/obs';
import { encounter, imageRecords, obs, patient, visit } from '../schema';
import type { ImageRecord } from '../schema';
import { SYNC_CLEAN, SYNC_DIRTY, VOIDED_NO, VOIDED_YES } from '../syncFlags';
import type { DbHandle } from '../tx';

/**
 * Images, across the two tables the legacy's one DAO straddled:
 * `tbl_image_records` (patient profile pictures, owned here outright) and the
 * image-concept rows of `tbl_obs` (owned by `obs.ts` — see below).
 *
 * NO BYTES ARE STORED. A profile picture keeps its path in `image_path`; an
 * obs image keeps none, because the obs uuid IS the filename stem. Reading,
 * re-encoding or base64-ing a file is a file service's job, not this one's.
 */

export type NewImageRecord = typeof imageRecords.$inferInsert;

/** A profile picture awaiting upload. The file itself is the caller's problem. */
export interface DirtyProfileImage {
  patientuuid: string | null;
  image_path: string | null;
}

/** An obs image awaiting upload, with the patient the join exists to recover. */
export interface DirtyObsImage {
  obsuuid: string;
  conceptuuid: string | null;
  encounteruuid: string | null;
  patientuuid: string | null;
  modified_date: string | null;
}

/**
 * The two concepts that make an obs an image. EVERY `tbl_obs` statement in this
 * file is filtered by them, which is what keeps `obs.ts` the sole owner of
 * clinical obs — nothing here can reach a row that is not an image.
 */
const IMAGE_CONCEPTS = [COMPLEX_IMAGE_AD, COMPLEX_IMAGE_PE];

const isImageObs = inArray(obs.conceptuuid, IMAGE_CONCEPTS);

// ── patient profile pictures ──────────────────────────────────────────────

/**
 * Update the patient's picture, or create the record. One statement either
 * way: the legacy ran its fallback INSERT *after* `endTransaction`, so the
 * update and the insert were two transactions and a crash between them lost
 * the row. The primary key is the PATIENT uuid, so a patient structurally
 * cannot have two.
 */
export function upsertProfileImage(
  input: { patientUuid: string; imagePath: string },
  on: DbHandle,
): void {
  const values = {
    uuid: input.patientUuid,
    patientuuid: input.patientUuid,
    image_path: input.imagePath,
    image_type: IMAGE_TYPE_PROFILE,
    // LOCAL, not UTC: this value is compared against the server's
    // ProfileImageTimestamp to decide whether to re-download the photo, and the
    // legacy wrote it with its local helper. (Arpan, 2026-10-12.)
    obs_time_date: localIsoTimestamp(),
    voided: VOIDED_NO,
    sync: SYNC_DIRTY,
  };

  on.insert(imageRecords)
    .values(values)
    .onConflictDoUpdate({ target: imageRecords.uuid, set: values })
    .run();
}

/** Clean flag after a successful upload. `image_type` was a parameter every caller passed 'PP'. */
export function markProfileImageSynced(patientUuid: string, on: DbHandle): void {
  on.update(imageRecords)
    .set({ sync: SYNC_CLEAN })
    .where(
      and(
        eq(imageRecords.patientuuid, patientUuid),
        eq(imageRecords.image_type, IMAGE_TYPE_PROFILE),
      ),
    )
    .run();
}

/**
 * Pictures awaiting upload. The legacy's WHERE was
 * `sync = '0' OR sync = 'false' AND image_type = 'PP'` — AND binds tighter, so
 * it returned EVERY row with sync '0' whatever its type. Latent only because
 * the table has held nothing but 'PP'. Parenthesised here.
 */
export function findDirtyProfileImages(on: DbHandle): DirtyProfileImage[] {
  return on
    .select({ patientuuid: imageRecords.patientuuid, image_path: imageRecords.image_path })
    .from(imageRecords)
    .where(
      and(
        eq(imageRecords.sync, SYNC_DIRTY),
        eq(imageRecords.image_type, IMAGE_TYPE_PROFILE),
      ),
    )
    .all();
}

/**
 * Change detection, not sync: the caller compares this against the server's
 * timestamp and re-downloads when they differ. Null on a miss — the legacy
 * returned '', which compares equal to nothing and re-downloads forever.
 */
export function findProfileImageTimestamp(patientUuid: string, on: DbHandle): string | null {
  const row = on
    .select({ obs_time_date: imageRecords.obs_time_date })
    .from(imageRecords)
    .where(
      and(
        eq(imageRecords.patientuuid, patientUuid),
        eq(imageRecords.image_type, IMAGE_TYPE_PROFILE),
      ),
    )
    .limit(1)
    .get();

  return row?.obs_time_date ?? null;
}

export function findProfileImage(patientUuid: string, on: DbHandle): ImageRecord | null {
  return (
    on.select().from(imageRecords).where(eq(imageRecords.uuid, patientUuid)).get() ?? null
  );
}

// ── obs images ────────────────────────────────────────────────────────────

/**
 * The stub obs row standing for a captured image. Explicit column set on
 * conflict: the legacy used REPLACE, which is DELETE+INSERT, so re-inserting
 * an existing obs uuid blanked its value, comment, creator and created_date.
 */
export function insertObsImage(
  input: { uuid: string; encounterUuid: string; conceptUuid: string },
  on: DbHandle,
): void {
  const values = {
    uuid: input.uuid,
    encounteruuid: input.encounterUuid,
    conceptuuid: input.conceptUuid,
    modified_date: utcIsoTimestamp(),
    voided: VOIDED_NO,
    sync: SYNC_DIRTY,
  };

  on.insert(obs).values(values).onConflictDoUpdate({ target: obs.uuid, set: values }).run();
}

/**
 * Clean flag after a successful upload — and after a successful server DELETE.
 * THE LEGACY NEVER DID THE SECOND: nothing marked a voided row clean once the
 * DELETE succeeded, so `findVoidedUnsyncedObsImageUuids` returned the same
 * uuid on every cycle and the app re-issued that DELETE forever. The sync seam
 * must call this on both paths.
 * Collapses two legacy methods that wrote 'TRUE' and 'true' respectively,
 * which is the entire reason its reads carried COLLATE NOCASE.
 */
export function markObsImageSynced(obsUuid: string, on: DbHandle): void {
  on.update(obs)
    .set({ sync: SYNC_CLEAN })
    .where(and(eq(obs.uuid, obsUuid), isImageObs))
    .run();
}

/** Soft delete, re-dirtied so the push issues a server DELETE. The JPEG is not touched. */
export function voidObsImage(obsUuid: string, on: DbHandle): void {
  on.update(obs)
    .set({ voided: VOIDED_YES, sync: SYNC_DIRTY })
    .where(and(eq(obs.uuid, obsUuid), isImageObs))
    .run();
}

/** Every image on an encounter for one concept, in one statement. */
export function voidObsImagesByEncounterAndConcept(
  encounterUuid: string,
  conceptUuid: string,
  on: DbHandle,
): void {
  on.update(obs)
    .set({ voided: VOIDED_YES, sync: SYNC_DIRTY })
    .where(
      and(eq(obs.encounteruuid, encounterUuid), eq(obs.conceptuuid, conceptUuid), isImageObs),
    )
    .run();
}

/** Voided locally, not yet deleted on the server. See `markObsImageSynced`. */
export function findVoidedUnsyncedObsImageUuids(on: DbHandle): string[] {
  return on
    .select({ uuid: obs.uuid })
    .from(obs)
    .where(and(isImageObs, eq(obs.voided, VOIDED_YES), eq(obs.sync, SYNC_DIRTY)))
    .all()
    .map((row) => row.uuid);
}

/**
 * Images awaiting upload. The join to visit and patient exists for one reason:
 * OpenMRS needs the patient uuid as the obs `person`, and `tbl_obs` has no
 * link to it. Renaming these columns into a push payload is the mapper's job.
 */
export function findDirtyObsImages(on: DbHandle): DirtyObsImage[] {
  return on
    .select({
      obsuuid: obs.uuid,
      conceptuuid: obs.conceptuuid,
      encounteruuid: encounter.uuid,
      patientuuid: patient.uuid,
      modified_date: obs.modified_date,
    })
    .from(obs)
    .innerJoin(encounter, eq(obs.encounteruuid, encounter.uuid))
    .innerJoin(visit, eq(encounter.visituuid, visit.uuid))
    .innerJoin(patient, eq(visit.patientuuid, patient.uuid))
    .where(and(isImageObs, eq(obs.sync, SYNC_DIRTY), eq(obs.voided, VOIDED_NO)))
    .all();
}

/**
 * The gallery read. Ordered by `modified_date`, which is the whole reason this
 * survived where two byte-identical siblings were dropped — the order is what
 * a gallery displays. Each uuid is also the on-disk filename stem.
 */
export function listObsImageUuids(
  encounterUuid: string,
  conceptUuid: string,
  on: DbHandle,
): string[] {
  return on
    .select({ uuid: obs.uuid })
    .from(obs)
    .where(
      and(
        eq(obs.encounteruuid, encounterUuid),
        eq(obs.conceptuuid, conceptUuid),
        isImageObs,
        eq(obs.voided, VOIDED_NO),
      ),
    )
    .orderBy(obs.modified_date)
    .all()
    .map((row) => row.uuid);
}
