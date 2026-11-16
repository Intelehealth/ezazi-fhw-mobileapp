import { IMAGE_TYPE_PROFILE } from '../../constants/literals';
import {
  findDirtyProfileImages,
  findProfileImage,
  findProfileImageTimestamp,
  markProfileImageSynced,
  upsertProfileImage,
} from '../../repositories/image';
import { imageRecords } from '../../schema';
import { SYNC_CLEAN, SYNC_DIRTY } from '../../syncFlags';
import type { DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * Patient profile pictures only. The obs-image half of this repository was
 * deleted 2026-11-16 — the app does not store obs images.
 */

const PATIENT = 'pt1';

describe('image repository', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  const records = () => ctx.db.select().from(imageRecords).all();

  describe('patient profile pictures', () => {
    it('creates dirty, keyed on the PATIENT uuid', () => {
      upsertProfileImage({ patientUuid: PATIENT, imagePath: '/a.jpg' }, db);

      expect(records()[0]).toMatchObject({
        uuid: PATIENT,
        patientuuid: PATIENT,
        image_path: '/a.jpg',
        image_type: IMAGE_TYPE_PROFILE,
        sync: SYNC_DIRTY,
      });
    });

    it('cannot give one patient two pictures', () => {
      upsertProfileImage({ patientUuid: PATIENT, imagePath: '/a.jpg' }, db);
      upsertProfileImage({ patientUuid: PATIENT, imagePath: '/b.jpg' }, db);

      expect(records()).toHaveLength(1);
      expect(findProfileImage(PATIENT, db)?.image_path).toBe('/b.jpg');
    });

    it('re-dirties on update, so a replaced picture is pushed', () => {
      upsertProfileImage({ patientUuid: PATIENT, imagePath: '/a.jpg' }, db);
      markProfileImageSynced(PATIENT, db);
      expect(records()[0].sync).toBe(SYNC_CLEAN);

      upsertProfileImage({ patientUuid: PATIENT, imagePath: '/b.jpg' }, db);
      expect(records()[0].sync).toBe(SYNC_DIRTY);
    });

    it('returns path and patient only — no file bytes, no DTO', () => {
      upsertProfileImage({ patientUuid: PATIENT, imagePath: '/a.jpg' }, db);

      expect(findDirtyProfileImages(db)).toEqual([
        { patientuuid: PATIENT, image_path: '/a.jpg' },
      ]);
    });

    it('drops a row from the dirty list once it is marked synced', () => {
      upsertProfileImage({ patientUuid: PATIENT, imagePath: '/a.jpg' }, db);
      markProfileImageSynced(PATIENT, db);

      expect(findDirtyProfileImages(db)).toEqual([]);
    });

    it('filters the dirty list by image_type, which the legacy precedence bug did not', () => {
      // `sync = '0' OR sync = 'false' AND image_type = 'PP'` parses as
      // `sync='0' OR (sync='false' AND type='PP')`, so any dirty row matched
      // whatever its type. Latent only because the table held nothing else.
      upsertProfileImage({ patientUuid: PATIENT, imagePath: '/a.jpg' }, db);
      ctx.db
        .insert(imageRecords)
        .values({
          uuid: 'other',
          patientuuid: 'pt2',
          image_path: '/other.jpg',
          image_type: 'NOT_PP',
          sync: SYNC_DIRTY,
        })
        .run();

      expect(findDirtyProfileImages(db)).toEqual([
        { patientuuid: PATIENT, image_path: '/a.jpg' },
      ]);
    });

    it('marking synced touches only that patient', () => {
      upsertProfileImage({ patientUuid: PATIENT, imagePath: '/a.jpg' }, db);
      upsertProfileImage({ patientUuid: 'pt2', imagePath: '/b.jpg' }, db);
      markProfileImageSynced(PATIENT, db);

      expect(findDirtyProfileImages(db)).toEqual([
        { patientuuid: 'pt2', image_path: '/b.jpg' },
      ]);
    });

    it('returns null for a patient with no picture, never an empty string', () => {
      // The caller compares this against the server timestamp to decide
      // whether to re-download. '' matches nothing, so it re-downloaded forever.
      expect(findProfileImageTimestamp('nobody', db)).toBeNull();
      expect(findProfileImage('nobody', db)).toBeNull();
    });

    it('stamps a LOCAL timestamp for change detection, as the legacy did', () => {
      // Compared against the server's ProfileImageTimestamp to decide whether to
      // re-download. The legacy used its local helper; we wrote UTC until
      // 2026-10-12. Local carries a T, millis and an offset.
      upsertProfileImage({ patientUuid: PATIENT, imagePath: '/a.jpg' }, db);

      expect(findProfileImageTimestamp(PATIENT, db)).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{4}$/,
      );
    });
  });
});
