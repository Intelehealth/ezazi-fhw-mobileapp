import { createTestDb, type TestDb } from '@/core/db/__tests__/helpers/testDb';
import { ENCOUNTER_ADMISSION } from '@/core/db/constants/encounter';
import { COMPLEX_IMAGE_AD } from '@/core/db/constants/obs';
import { encounterRepo, obsRepo, patientRepo, visitRepo } from '@/core/db/repositories';
import type { DbHandle } from '@/core/db/tx';

import { collectDirty, isEmpty } from '../collectDirty';

/**
 * The push queue. Children are reached THROUGH their parent, so the tests that
 * matter most are the ones showing what is NOT collected.
 */

const PATIENT = 'p1';
const VISIT = 'v1';
const ENC = 'e1';
const CONCEPT = 'concept-1';

describe('collectDirty', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  const seedClean = () => {
    patientRepo.upsertPatients([{ uuid: PATIENT, first_name: 'A' }], db);
    visitRepo.upsertManyFromServer([{ uuid: VISIT, patientuuid: PATIENT }], db);
    encounterRepo.upsertMany(
      [{ uuid: ENC, visituuid: VISIT, encounter_type_uuid: ENCOUNTER_ADMISSION }],
      db,
    );
  };

  it('collects nothing when every row is clean', () => {
    seedClean();

    const set = collectDirty(db);

    expect(set).toEqual({ patients: [], visits: [], encounters: [] });
    expect(isEmpty(set)).toBe(true);
  });

  it('returns a dirty patient with EVERY attribute row, not just the dirty ones', () => {
    seedClean();
    patientRepo.updatePatient(PATIENT, { first_name: 'B' }, db);
    patientRepo.upsertPatientAttributesFromServer(
      [{ uuid: 'a1', patientuuid: PATIENT, person_attribute_type_uuid: 't1', value: 'x' }],
      db,
    );

    const [entry] = collectDirty(db).patients;

    expect(entry.patient.uuid).toBe(PATIENT);
    expect(entry.attributes.map((a) => a.uuid)).toEqual(['a1']);
  });

  it('returns a dirty encounter with its unsent observations', () => {
    seedClean();
    const uuid = obsRepo.insert({ encounteruuid: ENC, conceptuuid: CONCEPT, value: 'x' }, db);
    encounterRepo.markDirty(ENC, db);

    const [entry] = collectDirty(db).encounters;

    expect(entry.encounter.uuid).toBe(ENC);
    expect(entry.observations.map((o) => o.uuid)).toEqual([uuid]);
  });

  it('leaves image observations out — they go up their own path', () => {
    seedClean();
    obsRepo.insert({ encounteruuid: ENC, conceptuuid: COMPLEX_IMAGE_AD, value: 'x' }, db);
    const clinical = obsRepo.insert({ encounteruuid: ENC, conceptuuid: CONCEPT, value: 'y' }, db);
    encounterRepo.markDirty(ENC, db);

    const [entry] = collectDirty(db).encounters;

    expect(entry.observations.map((o) => o.uuid)).toEqual([clinical]);
  });

  it('cannot reach an observation under a CLEAN encounter — this is why pairing exists', () => {
    seedClean();
    obsRepo.insert({ encounteruuid: ENC, conceptuuid: CONCEPT, value: 'x' }, db);
    encounterRepo.markSynced(ENC, db);

    expect(collectDirty(db).encounters).toEqual([]);
  });

  it('returns a dirty visit with its attributes attached', () => {
    seedClean();
    visitRepo.markDirty(VISIT, db);

    const [entry] = collectDirty(db).visits;

    expect(entry.uuid).toBe(VISIT);
    expect(entry.attributes).toEqual([]);
  });

});
