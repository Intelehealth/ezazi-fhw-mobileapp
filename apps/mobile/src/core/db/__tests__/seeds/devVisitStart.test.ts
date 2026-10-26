import { encounterTypeName } from '../../constants/encounter';
import { VISIT_SPECIALITY_OBGYN } from '../../constants/literals';
import { DECISION_PENDING, VISIT_DR_SPECIALITY, VISIT_HOLDER, VISIT_READ_STATUS } from '../../constants/visit';
import { encounterRepo, obsRepo, patientRepo, visitAttributeRepo, visitRepo } from '../../repositories';
import { encounter, obs } from '../../schema';
import { seedDevLiveVisit, startDevStage1 } from '../../seeds/devVisitStart';
import { DEV_LIVE_PATIENT, DEV_LIVE_VISIT_UUID } from '../../seeds/devVisitStart.data';
import { SYNC_DIRTY, VOIDED_NO } from '../../syncFlags';
import { transact, type DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * The live test visit: a dummy patient, visit and attributes that are never pushed, and a start
 * that writes only Stage 1's first card as Android does, leaving every later card to the engine.
 */

const PROVIDER = 'provider-dev';
const NOW = Date.UTC(2026, 9, 26, 10, 0, 0);
const MINUTE = 60_000;

const seed = (db: DbHandle) => transact((tx) => seedDevLiveVisit({ providerUuid: PROVIDER, now: NOW }, tx), db);
const start = (db: DbHandle, now = NOW) =>
  transact((tx) => startDevStage1({ providerUuid: PROVIDER, now }, tx), db);

describe('dev live visit', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  describe('seed', () => {
    it('opens a visit for the live patient, held by the logged-in provider, with no card', () => {
      expect(seed(db)).toBe(true);

      expect(visitRepo.findPatientUuidByVisit(DEV_LIVE_VISIT_UUID, db)).toBe(DEV_LIVE_PATIENT.uuid);
      expect(visitRepo.findActiveVisitsByProvider(PROVIDER, db).map((v) => v.uuid)).toEqual([DEV_LIVE_VISIT_UUID]);
      expect(db.select().from(encounter).all()).toEqual([]);
      expect(db.select().from(obs).all()).toEqual([]);
    });

    it("writes Android's four visit attributes", () => {
      seed(db);

      expect(visitAttributeRepo.findValue(DEV_LIVE_VISIT_UUID, VISIT_DR_SPECIALITY, db)).toBe(VISIT_SPECIALITY_OBGYN);
      expect(visitAttributeRepo.findValue(DEV_LIVE_VISIT_UUID, VISIT_HOLDER, db)).toBe(PROVIDER);
      expect(visitAttributeRepo.findValue(DEV_LIVE_VISIT_UUID, VISIT_READ_STATUS, db)).toBe('$');
      expect(visitAttributeRepo.findValue(DEV_LIVE_VISIT_UUID, DECISION_PENDING, db)).toBe('false');
    });

    it('runs once, and leaves nothing for the sync engine to push', () => {
      seed(db);

      expect(seed(db)).toBe(false);
      expect(patientRepo.listDirtyPatients(db)).toEqual([]);
      expect(visitRepo.findDirty(db)).toEqual([]);
    });
  });

  describe('start', () => {
    it('writes only Stage1_Hour1_1: at now, unsynced, not voided, no obs', () => {
      seed(db);
      expect(start(db)).toBe(true);

      const rows = db.select().from(encounter).all();
      expect(rows).toHaveLength(1);
      const [card] = rows;
      expect(encounterTypeName(card?.encounter_type_uuid ?? '')).toBe('Stage1_Hour1_1');
      expect(card).toMatchObject({
        visituuid: DEV_LIVE_VISIT_UUID,
        provider_uuid: PROVIDER,
        encounter_time: '2026-10-26 10:00:00',
        privacynotice_value: null,
        sync: SYNC_DIRTY,
        voided: VOIDED_NO,
      });
      expect(db.select().from(obs).all()).toEqual([]);
    });

    it('starts once: a second tap writes nothing', () => {
      seed(db);
      start(db);

      expect(start(db, NOW + MINUTE)).toBe(false);
      expect(encounterRepo.findTimelineByVisit(DEV_LIVE_VISIT_UUID, db)).toHaveLength(1);
      expect(obsRepo.listByEncounter(encounterRepo.findLatestClinicalByVisit(DEV_LIVE_VISIT_UUID, db)!.uuid, db)).toEqual([]);
    });

    it('writes nothing when the visit was never seeded', () => {
      expect(start(db)).toBe(false);
      expect(db.select().from(encounter).all()).toEqual([]);
    });
  });
});
