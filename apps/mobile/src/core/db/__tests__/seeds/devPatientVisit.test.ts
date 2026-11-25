import { localIsoTimestamp } from '@/core/utils/datetime';

import { DECISION_PENDING, VISIT_HOLDER, VISIT_READ_STATUS, VISIT_TELEMEDICINE } from '../../constants/visit';
import { patientRepo, visitAttributeRepo, visitRepo } from '../../repositories';
import { patient, visit, visitAttribute } from '../../schema';
import { writeDevPatientVisit, type DevPatient } from '../../seeds/devPatientVisit';
import { SYNC_CLEAN, VOIDED_NO } from '../../syncFlags';
import { transact, type DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * The shared writer behind both dev seeds: one patient, one open visit and its attributes,
 * all through pull-path writers so nothing fictional is ever pushed to the server.
 */

const PROVIDER = 'provider-dev';
const AT = Date.UTC(2026, 9, 26, 10, 0, 0);
const VISIT_UUID = 'visit-dev-1';
const UNKNOWN_TYPE = 'not-a-pulled-attribute-type';

const PATIENT: DevPatient = {
  uuid: 'patient-dev-1',
  openmrsId: 'EZ-DEV-9999',
  firstName: 'Seed',
  lastName: 'Writer',
  dateOfBirth: '1995-01-15',
  gender: 'F',
};

const write = (db: DbHandle, attributes: readonly (readonly [string, string])[] = [[VISIT_HOLDER, PROVIDER]]) =>
  transact(
    (tx) => writeDevPatientVisit({ patient: PATIENT, visitUuid: VISIT_UUID, providerUuid: PROVIDER, at: AT, attributes }, tx),
    db,
  );

describe('writeDevPatientVisit', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  it('writes the patient, created by the provider at the given time', () => {
    write(db);

    expect(db.select().from(patient).all()).toEqual([
      expect.objectContaining({
        uuid: PATIENT.uuid,
        openmrs_id: PATIENT.openmrsId,
        first_name: PATIENT.firstName,
        last_name: PATIENT.lastName,
        date_of_birth: PATIENT.dateOfBirth,
        gender: PATIENT.gender,
        creatoruuid: PROVIDER,
        dateCreated: localIsoTimestamp(AT),
        voided: VOIDED_NO,
      }),
    ]);
  });

  it('opens one telemedicine visit for that patient, started at the given time', () => {
    write(db);

    expect(db.select().from(visit).all()).toEqual([
      expect.objectContaining({
        uuid: VISIT_UUID,
        patientuuid: PATIENT.uuid,
        startdate: localIsoTimestamp(AT),
        visit_type_uuid: VISIT_TELEMEDICINE,
        creator: PROVIDER,
        voided: VOIDED_NO,
      }),
    ]);
    expect(visitRepo.findActiveVisitsByProvider(PROVIDER, db).map((v) => v.uuid)).toEqual([VISIT_UUID]);
  });

  it('writes each attribute pair on the visit', () => {
    write(db, [
      [VISIT_HOLDER, PROVIDER],
      [VISIT_READ_STATUS, '$'],
      [DECISION_PENDING, 'false'],
    ]);

    expect(visitAttributeRepo.findValue(VISIT_UUID, VISIT_HOLDER, db)).toBe(PROVIDER);
    expect(visitAttributeRepo.findValue(VISIT_UUID, VISIT_READ_STATUS, db)).toBe('$');
    expect(visitAttributeRepo.findValue(VISIT_UUID, DECISION_PENDING, db)).toBe('false');
    expect(db.select().from(visitAttribute).all()).toHaveLength(3);
  });

  it('leaves every row sync-clean, so the sync engine never pushes it', () => {
    write(db, [
      [VISIT_HOLDER, PROVIDER],
      [DECISION_PENDING, 'false'],
    ]);

    expect(patientRepo.listDirtyPatients(db)).toEqual([]);
    expect(visitRepo.findDirty(db)).toEqual([]);
    expect(db.select().from(patient).all().map((row) => row.sync)).toEqual([SYNC_CLEAN]);
    expect(db.select().from(visit).all().map((row) => row.sync)).toEqual([SYNC_CLEAN]);
    expect(db.select().from(visitAttribute).all().map((row) => row.sync)).toEqual([SYNC_CLEAN, SYNC_CLEAN]);
  });

  it('drops an attribute type the pull writer does not keep, as the pull does', () => {
    write(db, [
      [VISIT_HOLDER, PROVIDER],
      [UNKNOWN_TYPE, 'anything'],
    ]);

    expect(visitAttributeRepo.findValue(VISIT_UUID, UNKNOWN_TYPE, db)).toBeNull();
    expect(db.select().from(visitAttribute).all()).toHaveLength(1);
  });

  it('updates rather than duplicates when written again', () => {
    write(db, [[DECISION_PENDING, 'false']]);
    write(db, [[DECISION_PENDING, 'true']]);

    expect(db.select().from(patient).all()).toHaveLength(1);
    expect(db.select().from(visit).all()).toHaveLength(1);
    expect(db.select().from(visitAttribute).all()).toHaveLength(1);
    expect(visitAttributeRepo.findValue(VISIT_UUID, DECISION_PENDING, db)).toBe('true');
  });
});
