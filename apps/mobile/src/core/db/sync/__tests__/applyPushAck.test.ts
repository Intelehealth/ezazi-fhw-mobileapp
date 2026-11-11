import { eq } from 'drizzle-orm';

import { ENCOUNTER_ADMISSION } from '@/core/db/constants/encounter';
import { encounterRepo, obsRepo, patientRepo, visitRepo } from '@/core/db/repositories';
import { encounter, obs, patient, patientAttribute } from '@/core/db/schema';
import { SYNC_CLEAN, SYNC_DIRTY } from '@/core/db/syncFlags';
import { transact, type DbHandle } from '@/core/db/tx';
import { createTestDb, type TestDb } from '@/core/db/__tests__/helpers/testDb';

import { applyPushAck } from '../applyPushAck';
import { buildPushBody } from '../buildPushBody';
import { collectDirty, isEmpty } from '../collectDirty';

/**
 * The push reply. Per record, keyed by uuid. The reply never names an
 * observation or an attribute, so children are cleared off their parent — and
 * only the children that actually went.
 */

const PATIENT = 'p1';
const VISIT = 'v1';
const ENC = 'e1';
const CONTEXT = { locationUuid: 'loc-1' };

describe('applyPushAck', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;

    patientRepo.upsertPatients([{ uuid: PATIENT, first_name: 'Asha' }], db);
    visitRepo.upsertManyFromServer([{ uuid: VISIT, patientuuid: PATIENT }], db);
  });

  afterEach(() => ctx.close());

  const sent = () => buildPushBody(collectDirty(db), CONTEXT, db);
  const encSync = () => ctx.db.select().from(encounter).where(eq(encounter.uuid, ENC)).get()?.sync;
  const obsRow = (uuid: string) => ctx.db.select().from(obs).where(eq(obs.uuid, uuid)).get();
  const patientRow = () => ctx.db.select().from(patient).where(eq(patient.uuid, PATIENT)).get();
  const attrRows = () => ctx.db.select().from(patientAttribute).all();

  const seedEncounterWithObs = () => {
    encounterRepo.upsert(
      { uuid: ENC, visituuid: VISIT, encounter_type_uuid: ENCOUNTER_ADMISSION },
      db,
    );
    return obsRepo.insert({ encounteruuid: ENC, conceptuuid: 'c1', value: '120' }, db);
  };

  it('clears an accepted encounter AND the observations that rode with it', () => {
    const uuid = seedEncounterWithObs();
    const built = sent();

    const result = applyPushAck({ encounterlist: [{ uuid: ENC, sync: true }] }, built, db);

    expect(encSync()).toBe(SYNC_CLEAN);
    expect(obsRow(uuid)?.sync).toBe(SYNC_CLEAN);
    expect(result).toMatchObject({ encounters: 1, observations: 1 });
  });

  it('leaves a REJECTED encounter and its observations dirty, and names it', () => {
    const uuid = seedEncounterWithObs();
    const built = sent();

    const result = applyPushAck({ encounterlist: [{ uuid: ENC, sync: false }] }, built, db);

    expect(encSync()).toBe(SYNC_DIRTY);
    expect(obsRow(uuid)?.sync).toBe(SYNC_DIRTY);
    expect(result.rejected).toEqual([ENC]);
  });

  it('leaves a record the reply never mentions completely alone', () => {
    const uuid = seedEncounterWithObs();
    const built = sent();

    applyPushAck({ encounterlist: [] }, built, db);

    expect(encSync()).toBe(SYNC_DIRTY);
    expect(obsRow(uuid)?.sync).toBe(SYNC_DIRTY);
  });

  it('does NOT clear an observation that was dropped before sending', () => {
    encounterRepo.upsert(
      { uuid: ENC, visituuid: VISIT, encounter_type_uuid: ENCOUNTER_ADMISSION },
      db,
    );
    const kept = obsRepo.insert({ encounteruuid: ENC, conceptuuid: 'c1', value: '120' }, db);
    const dropped = obsRepo.insert({ encounteruuid: ENC, conceptuuid: 'c2', value: null }, db);
    const built = sent();

    applyPushAck({ encounterlist: [{ uuid: ENC, sync: true }] }, built, db);

    expect(obsRow(kept)?.sync).toBe(SYNC_CLEAN);
    expect(obsRow(dropped)?.sync).toBe(SYNC_DIRTY);
  });

  it('stores the identifier the server minted, and clears the attributes', () => {
    patientRepo.updatePatient(PATIENT, { first_name: 'Asha' }, db);
    patientRepo.upsertPatientAttributes(
      [{ uuid: 'a1', patientuuid: PATIENT, person_attribute_type_uuid: 't1', value: '7' }],
      db,
    );
    const built = sent();

    applyPushAck(
      { patientlist: [{ uuid: PATIENT, openmrs_id: 'EZ-10517', sync: true }] },
      built,
      db,
    );

    expect(patientRow()).toMatchObject({ openmrs_id: 'EZ-10517', sync: SYNC_CLEAN });
    expect(attrRows()[0]).toMatchObject({ sync: SYNC_CLEAN });
  });

  it('does not wipe an identifier we already hold when the reply omits it', () => {
    patientRepo.markPatientSynced(PATIENT, 'EZ-1', SYNC_DIRTY, db);
    const built = sent();

    applyPushAck({ patientlist: [{ uuid: PATIENT, sync: true }] }, built, db);

    expect(patientRow()?.openmrs_id).toBe('EZ-1');
  });

  it('accepts sync as a boolean or as the string the legacy sends', () => {
    seedEncounterWithObs();
    const built = sent();

    applyPushAck({ encounterlist: [{ uuid: ENC, sync: 'true' }] }, built, db);

    expect(encSync()).toBe(SYNC_CLEAN);
  });

  it('rolls the whole ack back when anything throws', () => {
    const uuid = seedEncounterWithObs();
    const built = sent();

    expect(() =>
      transact((tx) => {
        applyPushAck({ encounterlist: [{ uuid: ENC, sync: true }] }, built, tx);
        throw new Error('later failure');
      }, db),
    ).toThrow('later failure');

    expect(encSync()).toBe(SYNC_DIRTY);
    expect(obsRow(uuid)?.sync).toBe(SYNC_DIRTY);
  });

  it('empties the queue on a full accept — the cycle terminates', () => {
    // The point of the whole chain: collect, build, ack, nothing left waiting.
    seedEncounterWithObs();
    patientRepo.updatePatient(PATIENT, { first_name: 'Asha' }, db);
    visitRepo.markDirty(VISIT, db);
    const built = sent();

    applyPushAck(
      {
        patientlist: [{ uuid: PATIENT, openmrs_id: 'EZ-1', sync: true }],
        visitlist: [{ uuid: VISIT, sync: true }],
        encounterlist: [{ uuid: ENC, sync: true }],
      },
      built,
      db,
    );

    expect(isEmpty(collectDirty(db))).toBe(true);
  });
});
