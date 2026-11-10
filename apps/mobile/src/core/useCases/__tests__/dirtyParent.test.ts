import { eq } from 'drizzle-orm';

import { createTestDb, type TestDb } from '@/core/db/__tests__/helpers/testDb';
import { encounterRepo, obsRepo, patientRepo, visitRepo } from '@/core/db/repositories';
import { encounter, obs, patient, visit } from '@/core/db/schema';
import { SYNC_CLEAN, SYNC_DIRTY } from '@/core/db/syncFlags';
import { transact, type DbHandle } from '@/core/db/tx';

import * as obsWrites from '../obsWrites';
import * as patientAttributeWrites from '../patientAttributeWrites';
import * as visitAttributeWrites from '../visitAttributeWrites';

/**
 * The dirty-parent rule. The push walks unsent PARENTS and asks each for its
 * unsent children, so a child left dirty under a clean parent is collected by
 * nothing. Every test here seeds a CLEAN parent and asserts the write woke it.
 */

const ENC = 'e1';
const PATIENT = 'p1';
const VISIT = 'v1';
const CONCEPT = 'concept-1';
const ATTR_TYPE = 'type-1';

describe('the dirty-parent rule', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;

    // Pull writers land clean, which is the starting state that matters.
    encounterRepo.upsertMany([{ uuid: ENC, visituuid: VISIT }], db);
    patientRepo.upsertPatients([{ uuid: PATIENT, first_name: 'A' }], db);
    visitRepo.upsertManyFromServer([{ uuid: VISIT, patientuuid: PATIENT }], db);
  });

  afterEach(() => ctx.close());

  const encounterSync = () =>
    ctx.db.select().from(encounter).where(eq(encounter.uuid, ENC)).get()?.sync;
  const patientSync = () =>
    ctx.db.select().from(patient).where(eq(patient.uuid, PATIENT)).get()?.sync;
  const visitSync = () => ctx.db.select().from(visit).where(eq(visit.uuid, VISIT)).get()?.sync;

  describe('observations wake their encounter', () => {
    it('recording one', () => {
      expect(encounterSync()).toBe(SYNC_CLEAN);

      obsWrites.recordObs({ encounteruuid: ENC, conceptuuid: CONCEPT, value: 'x' }, db);

      expect(encounterSync()).toBe(SYNC_DIRTY);
    });

    it('editing one, found by looking the obs up', () => {
      const uuid = obsRepo.insert({ encounteruuid: ENC, conceptuuid: CONCEPT, value: 'x' }, db);
      encounterRepo.markSynced(ENC, db);

      obsWrites.editObs(uuid, { value: 'y' }, db);

      expect(encounterSync()).toBe(SYNC_DIRTY);
    });

    it('voiding one', () => {
      const uuid = obsRepo.insert({ encounteruuid: ENC, conceptuuid: CONCEPT, value: 'x' }, db);
      encounterRepo.markSynced(ENC, db);

      obsWrites.voidObs([uuid], db);

      expect(encounterSync()).toBe(SYNC_DIRTY);
    });

    it('but writing NOTHING wakes nothing', () => {
      // An empty admission form must not schedule a push.
      obsWrites.recordAdmissionValues(
        { encounterUuid: ENC, creator: 'dr', creatorUuid: 'dr-1', values: {} },
        db,
      );

      expect(encounterSync()).toBe(SYNC_CLEAN);
    });
  });

  describe('patient attributes wake their patient', () => {
    it('recording one', () => {
      patientAttributeWrites.recordPatientAttribute(PATIENT, ATTR_TYPE, 'x', db);

      expect(patientSync()).toBe(SYNC_DIRTY);
    });

    it('recording several, one flag each however many rows', () => {
      patientAttributeWrites.recordPatientAttributes(
        [
          { uuid: 'a1', patientuuid: PATIENT, person_attribute_type_uuid: ATTR_TYPE, value: 'x' },
          { uuid: 'a2', patientuuid: PATIENT, person_attribute_type_uuid: 'type-2', value: 'y' },
        ],
        db,
      );

      expect(patientSync()).toBe(SYNC_DIRTY);
    });
  });

  describe('visit attributes wake their visit, but only on a real write', () => {
    it('an insert wakes it', () => {
      visitAttributeWrites.recordVisitAttribute(VISIT, ATTR_TYPE, 'x', db);

      expect(visitSync()).toBe(SYNC_DIRTY);
    });

    it('an unchanged value flips no flag', () => {
      visitAttributeWrites.upsertVisitAttribute(VISIT, ATTR_TYPE, 'x', db);
      visitRepo.markSynced(VISIT, db);

      const written = visitAttributeWrites.upsertVisitAttribute(VISIT, ATTR_TYPE, 'x', db);

      expect(written).toBeNull();
      expect(visitSync()).toBe(SYNC_CLEAN);
    });

    it('updating a pair that has no row flips no flag', () => {
      const written = visitAttributeWrites.updateVisitAttribute(VISIT, 'absent-type', 'x', db);

      expect(written).toBe(false);
      expect(visitSync()).toBe(SYNC_CLEAN);
    });
  });

  it('rolls back BOTH writes when the surrounding transaction throws', () => {
    // The whole point of pairing them inside one transact: never one without
    // the other.
    expect(() =>
      transact((tx) => {
        obsWrites.recordObs({ encounteruuid: ENC, conceptuuid: CONCEPT, value: 'x' }, tx);
        throw new Error('later write failed');
      }, db),
    ).toThrow('later write failed');

    expect(ctx.db.select().from(obs).all()).toEqual([]);
    expect(encounterSync()).toBe(SYNC_CLEAN);
  });
});
