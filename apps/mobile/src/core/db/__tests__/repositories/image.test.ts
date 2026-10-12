import { eq } from 'drizzle-orm';

import { IMAGE_TYPE_PROFILE } from '../../constants/literals';
import { COMPLEX_IMAGE_AD, COMPLEX_IMAGE_PE, CURRENT_COMPLAINT } from '../../constants/obs';
import {
  findDirtyObsImages,
  findDirtyProfileImages,
  findProfileImage,
  findProfileImageTimestamp,
  findVoidedUnsyncedObsImageUuids,
  insertObsImage,
  listObsImageUuids,
  markObsImageSynced,
  markProfileImageSynced,
  upsertProfileImage,
  voidObsImage,
  voidObsImagesByEncounterAndConcept,
} from '../../repositories/image';
import { encounter, imageRecords, obs, patient, visit } from '../../schema';
import { SYNC_CLEAN, SYNC_DIRTY, VOIDED_NO, VOIDED_YES } from '../../syncFlags';
import type { DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * Two flows that share nothing but a name. The sharpest tests are the ones
 * proving this file cannot touch a clinical obs: every `tbl_obs` statement
 * carries the image-concept filter, and that is what keeps `obs.ts` the owner.
 */

const PATIENT = 'pt1';
const VISIT = 'v1';
const ENC = 'e1';

describe('image repository', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  const records = () => ctx.db.select().from(imageRecords).all();
  const obsRow = (uuid: string) => ctx.db.select().from(obs).where(eq(obs.uuid, uuid)).get();

  const seedTree = () => {
    ctx.db.insert(patient).values({ uuid: PATIENT }).run();
    ctx.db.insert(visit).values({ uuid: VISIT, patientuuid: PATIENT }).run();
    ctx.db.insert(encounter).values({ uuid: ENC, visituuid: VISIT }).run();
  };

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

    it('stamps a timestamp for change detection', () => {
      upsertProfileImage({ patientUuid: PATIENT, imagePath: '/a.jpg' }, db);

      expect(findProfileImageTimestamp(PATIENT, db)).toBeTruthy();
    });
  });

  describe('obs images', () => {
    beforeEach(seedTree);

    it('writes a stub row, dirty and unvoided', () => {
      insertObsImage({ uuid: 'o1', encounterUuid: ENC, conceptUuid: COMPLEX_IMAGE_AD }, db);

      expect(obsRow('o1')).toMatchObject({
        encounteruuid: ENC,
        conceptuuid: COMPLEX_IMAGE_AD,
        voided: VOIDED_NO,
        sync: SYNC_DIRTY,
      });
    });

    it('does not blank the clinical columns of an existing row', () => {
      // The legacy used REPLACE, which is DELETE+INSERT, so re-inserting an
      // existing obs uuid wiped its value, comment, creator and created_date.
      ctx.db
        .insert(obs)
        .values({
          uuid: 'o1',
          encounteruuid: ENC,
          conceptuuid: COMPLEX_IMAGE_AD,
          value: 'kept',
          comment: 'R',
          creator: '7',
          created_date: '2026-01-01',
        })
        .run();

      insertObsImage({ uuid: 'o1', encounterUuid: ENC, conceptUuid: COMPLEX_IMAGE_AD }, db);

      expect(obsRow('o1')).toMatchObject({
        value: 'kept',
        comment: 'R',
        creator: '7',
        created_date: '2026-01-01',
      });
    });

    it('recovers the patient through the visit, which is why the join exists', () => {
      insertObsImage({ uuid: 'o1', encounterUuid: ENC, conceptUuid: COMPLEX_IMAGE_AD }, db);

      expect(findDirtyObsImages(db)).toEqual([
        {
          obsuuid: 'o1',
          conceptuuid: COMPLEX_IMAGE_AD,
          encounteruuid: ENC,
          patientuuid: PATIENT,
          modified_date: expect.any(String),
        },
      ]);
    });

    it('omits an image whose encounter has no visit', () => {
      ctx.db.insert(encounter).values({ uuid: 'orphan', visituuid: 'missing' }).run();
      insertObsImage({ uuid: 'o1', encounterUuid: 'orphan', conceptUuid: COMPLEX_IMAGE_AD }, db);

      expect(findDirtyObsImages(db)).toEqual([]);
    });

    it('omits voided and already-synced images from the upload list', () => {
      insertObsImage({ uuid: 'o1', encounterUuid: ENC, conceptUuid: COMPLEX_IMAGE_AD }, db);
      insertObsImage({ uuid: 'o2', encounterUuid: ENC, conceptUuid: COMPLEX_IMAGE_PE }, db);
      voidObsImage('o1', db);
      markObsImageSynced('o2', db);

      expect(findDirtyObsImages(db)).toEqual([]);
    });

    it('voiding re-dirties the row so the push issues a server DELETE', () => {
      insertObsImage({ uuid: 'o1', encounterUuid: ENC, conceptUuid: COMPLEX_IMAGE_AD }, db);
      markObsImageSynced('o1', db);

      voidObsImage('o1', db);
      expect(obsRow('o1')).toMatchObject({ voided: VOIDED_YES, sync: SYNC_DIRTY });
      expect(findVoidedUnsyncedObsImageUuids(db)).toEqual(['o1']);
    });

    it('marking synced ends the delete loop the legacy never terminated', () => {
      // Nothing marked the row clean after a successful server DELETE, so the
      // same uuid came back every cycle and the DELETE was re-issued forever.
      insertObsImage({ uuid: 'o1', encounterUuid: ENC, conceptUuid: COMPLEX_IMAGE_AD }, db);
      voidObsImage('o1', db);
      expect(findVoidedUnsyncedObsImageUuids(db)).toEqual(['o1']);

      markObsImageSynced('o1', db);
      expect(findVoidedUnsyncedObsImageUuids(db)).toEqual([]);
    });

    it('voids every image for an encounter and concept at once', () => {
      insertObsImage({ uuid: 'o1', encounterUuid: ENC, conceptUuid: COMPLEX_IMAGE_AD }, db);
      insertObsImage({ uuid: 'o2', encounterUuid: ENC, conceptUuid: COMPLEX_IMAGE_AD }, db);
      insertObsImage({ uuid: 'o3', encounterUuid: ENC, conceptUuid: COMPLEX_IMAGE_PE }, db);

      voidObsImagesByEncounterAndConcept(ENC, COMPLEX_IMAGE_AD, db);

      expect(findVoidedUnsyncedObsImageUuids(db).sort()).toEqual(['o1', 'o2']);
      expect(obsRow('o3')?.voided).toBe(VOIDED_NO);
    });

    it('lists gallery uuids in modified_date order, skipping voided', () => {
      // The uuids deliberately sort OPPOSITE to the dates. Order them by uuid
      // and this flips — which is the ordering a gallery actually displays,
      // and the only reason this read survived where two siblings were dropped.
      ctx.db
        .insert(obs)
        .values([
          {
            uuid: 'aaa-newest',
            encounteruuid: ENC,
            conceptuuid: COMPLEX_IMAGE_AD,
            modified_date: '2026-06-01',
          },
          {
            uuid: 'zzz-oldest',
            encounteruuid: ENC,
            conceptuuid: COMPLEX_IMAGE_AD,
            modified_date: '2026-01-01',
          },
          {
            uuid: 'mmm-voided',
            encounteruuid: ENC,
            conceptuuid: COMPLEX_IMAGE_AD,
            modified_date: '2026-03-01',
            voided: VOIDED_YES,
          },
        ])
        .run();

      expect(listObsImageUuids(ENC, COMPLEX_IMAGE_AD, db)).toEqual([
        'zzz-oldest',
        'aaa-newest',
      ]);
    });
  });

  describe('clinical obs are out of reach', () => {
    beforeEach(seedTree);

    const seedClinical = () =>
      ctx.db
        .insert(obs)
        .values({
          uuid: 'clinical',
          encounteruuid: ENC,
          conceptuuid: CURRENT_COMPLAINT,
          value: 'headache',
          comment: 'R',
          voided: VOIDED_NO,
          sync: SYNC_DIRTY,
        })
        .run();

    it('a dirty clinical obs is never offered for image upload', () => {
      seedClinical();

      expect(findDirtyObsImages(db)).toEqual([]);
      expect(findVoidedUnsyncedObsImageUuids(db)).toEqual([]);
      expect(listObsImageUuids(ENC, CURRENT_COMPLAINT, db)).toEqual([]);
    });

    it('no write in this file can touch a clinical obs', () => {
      seedClinical();

      markObsImageSynced('clinical', db);
      voidObsImage('clinical', db);
      voidObsImagesByEncounterAndConcept(ENC, CURRENT_COMPLAINT, db);

      expect(obsRow('clinical')).toMatchObject({
        value: 'headache',
        comment: 'R',
        voided: VOIDED_NO,
        sync: SYNC_DIRTY,
      });
    });
  });
});
