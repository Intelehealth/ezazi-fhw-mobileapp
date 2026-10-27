import { NORMAL_CARD_MARKER } from '@ezazi/clinical-rules';

import { ENCOUNTER_ADMISSION, LCG_SOS, encounterTypeUuid } from '../../constants/encounter';
import { ENCOUNTER_TYPE, MISSED_ENCOUNTER, SOS_STAGE_HOUR } from '../../constants/obs';
import { DECISION_PENDING, VISIT_HOLDER } from '../../constants/visit';
import { encounterRepo, obsRepo, patientRepo, visitAttributeRepo, visitRepo } from '../../repositories';
import { encounter, obs } from '../../schema';
import { seedDevPatient } from '../../seeds/devPatient';
import { DEV_CARDS, DEV_PATIENT, DEV_VISIT_UUID } from '../../seeds/devPatient.data';
import { transact, type DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * The fake patient must give the timeline one card in every state, owned by the
 * logged-in provider, and must never be pushed: a seeded row reaching the
 * server would plant a fictional woman in real clinical data.
 */

const PROVIDER = 'provider-dev';
const NOW = Date.UTC(2026, 9, 23, 10, 0, 0);

const seed = (db: DbHandle) =>
  transact((tx) => seedDevPatient({ providerUuid: PROVIDER, now: NOW }, tx), db);

const cardUuid = (db: DbHandle, name: string) =>
  encounterRepo.findTimelineByVisit(DEV_VISIT_UUID, db).find(
    (row) => row.encounter_type_uuid === encounterTypeUuid(name),
  )?.uuid ?? '';

describe('dev patient seed', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  it('writes the patient and an open visit held by the logged-in provider', () => {
    expect(seed(db)).toBe(true);

    expect(visitRepo.findPatientUuidByVisit(DEV_VISIT_UUID, db)).toBe(DEV_PATIENT.uuid);
    expect(visitRepo.findActiveVisitsByProvider(PROVIDER, db).map((v) => v.uuid)).toEqual([
      DEV_VISIT_UUID,
    ]);
    expect(visitAttributeRepo.findValue(DEV_VISIT_UUID, VISIT_HOLDER, db)).toBe(PROVIDER);
    expect(visitAttributeRepo.findValue(DEV_VISIT_UUID, DECISION_PENDING, db)).toBe('false');
  });

  it('runs once: a second call writes nothing', () => {
    seed(db);
    const encountersBefore = db.select().from(encounter).all().length;
    const obsBefore = db.select().from(obs).all().length;

    expect(seed(db)).toBe(false);
    expect(db.select().from(encounter).all()).toHaveLength(encountersBefore);
    expect(db.select().from(obs).all()).toHaveLength(obsBefore);
  });

  it('leaves nothing for the sync engine to push', () => {
    seed(db);

    expect(patientRepo.listDirtyPatients(db)).toEqual([]);
    expect(visitRepo.findDirty(db)).toEqual([]);
    expect(encounterRepo.findUnsynced(db)).toEqual([]);
    for (const row of db.select().from(encounter).all()) {
      expect(obsRepo.listUnsyncedByEncounter(row.uuid, db)).toEqual([]);
    }
  });

  it('puts every card and the SOS on the timeline, hiding the Admission encounter', () => {
    seed(db);
    const timeline = encounterRepo.findTimelineByVisit(DEV_VISIT_UUID, db);
    const types = timeline.map((row) => row.encounter_type_uuid);

    expect(timeline).toHaveLength(DEV_CARDS.length + 1);
    expect(types).toContain(LCG_SOS);
    expect(types).not.toContain(ENCOUNTER_ADMISSION);
  });

  it('gives one card in each timeline state', () => {
    seed(db);
    const [first, second, missed, due] = DEV_CARDS.map((card) => cardUuid(db, card.name));

    expect(obsRepo.hasRealObs(first, db)).toBe(true);
    expect(obsRepo.hasRealObs(second, db)).toBe(true);
    expect(obsRepo.hasDataObs(missed, db)).toBe(true);
    expect(obsRepo.hasRealObs(missed, db)).toBe(false);
    expect(obsRepo.hasDataObs(due, db)).toBe(false);
    expect(encounterRepo.findLatestClinicalByVisit(DEV_VISIT_UUID, db)?.uuid).toBe(due);
  });

  it('marks every card NORMAL, the first too (Android leaves the first unmarked; decided 2026-10-27)', () => {
    seed(db);

    for (const card of DEV_CARDS) expect(obsRepo.getEncounterTypeValue(cardUuid(db, card.name), db)).toBe(NORMAL_CARD_MARKER);
  });

  it('keeps Android comments: NULL on the NORMAL marker and SOS label, an empty string on the Missed marker', () => {
    seed(db);
    const commentsOf = (conceptUuid: string) =>
      db.select().from(obs).all().filter((row) => row.conceptuuid === conceptUuid).map((row) => row.comment);

    expect(new Set(commentsOf(ENCOUNTER_TYPE))).toEqual(new Set([null]));
    expect(commentsOf(SOS_STAGE_HOUR)).toEqual([null]);
    expect(commentsOf(MISSED_ENCOUNTER)).toEqual(['']);
  });

  it('labels the SOS card with its stage and hour', () => {
    seed(db);
    const sos = encounterRepo.findLatestSosByVisit(DEV_VISIT_UUID, db);

    expect(obsRepo.getSosStageHourValue(sos?.uuid ?? '', db)).toBe('Stage1_Hour2_SOS1');
  });
});
