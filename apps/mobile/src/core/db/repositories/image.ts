import { and, eq } from 'drizzle-orm';

import { localIsoTimestamp } from '@/core/utils/datetime';

import { IMAGE_TYPE_PROFILE } from '../constants/literals';
import { imageRecords } from '../schema';
import type { ImageRecord } from '../schema';
import { SYNC_CLEAN, SYNC_DIRTY, VOIDED_NO } from '../syncFlags';
import type { DbHandle } from '../tx';

/**
 * Patient profile pictures — `tbl_image_records`, `image_type = 'PP'`.
 *
 * The obs-image half was deleted 2026-11-16: this app does not store obs
 * images, so `obs.ts` is now the only owner of `tbl_obs`.
 *
 * NO BYTES ARE STORED. The picture's path lives in `image_path`; reading or
 * re-encoding the file is a file service's job, and that service is deferred
 * with the capture screen.
 */

export type NewImageRecord = typeof imageRecords.$inferInsert;

/** A profile picture awaiting upload. The file itself is the caller's problem. */
export interface DirtyProfileImage {
  patientuuid: string | null;
  image_path: string | null;
}

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
