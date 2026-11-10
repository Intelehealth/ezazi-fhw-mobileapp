import { ENCOUNTER_ADMISSION, ENCOUNTER_EMERGENCY } from '@/core/db/constants/encounter';
import { PROVIDER_ENCOUNTER_ROLE } from '@/core/db/constants/provider';
import { OPENMRS_IDENTIFIER_TYPE } from '@/core/db/constants/wire';
import { encounterRepo, obsRepo, patientRepo, visitRepo } from '@/core/db/repositories';
import type { DbHandle } from '@/core/db/tx';
import { createTestDb, type TestDb } from '@/core/db/__tests__/helpers/testDb';

import { buildPushBody } from '../buildPushBody';
import { collectDirty } from '../collectDirty';

/**
 * The push body. It is OpenMRS resource shapes, not our tables — so the tests
 * are about nesting and about what is deliberately left OUT.
 */

const LOCATION = 'loc-1';
const PATIENT = 'p1';
const VISIT = 'v1';
const CONTEXT = { locationUuid: LOCATION };

describe('buildPushBody', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;

    patientRepo.upsertPatients(
      [
        {
          uuid: PATIENT,
          first_name: 'Asha',
          middle_name: 'R',
          last_name: 'Devi',
          date_of_birth: '1996-04-02',
          gender: 'F',
          city_village: 'Pune',
        },
      ],
      db,
    );
    visitRepo.upsertManyFromServer([{ uuid: VISIT, patientuuid: PATIENT }], db);
  });

  afterEach(() => ctx.close());

  const build = () => buildPushBody(collectDirty(db), CONTEXT, db);

  it('nests names, addresses and attributes under the person', () => {
    patientRepo.updatePatient(PATIENT, { first_name: 'Asha' }, db);
    patientRepo.upsertPatientAttributesFromServer(
      [{ uuid: 'a1', patientuuid: PATIENT, person_attribute_type_uuid: 't1', value: '7' }],
      db,
    );

    const [person] = build().body.persons;

    expect(person.names).toEqual([{ givenName: 'Asha', middleName: 'R', familyName: 'Devi' }]);
    expect(person.addresses[0].cityVillage).toBe('Pune');
    expect(person.attributes).toEqual([{ attributeType: 't1', value: '7' }]);
  });

  it('sends an identifier TYPE and the session location, never an identifier value', () => {
    patientRepo.updatePatient(PATIENT, { first_name: 'Asha' }, db);

    const [patient] = build().body.patients;

    expect(patient.person).toBe(PATIENT);
    expect(patient.identifiers).toEqual([
      { identifierType: OPENMRS_IDENTIFIER_TYPE, location: LOCATION, preferred: true },
    ]);
  });

  it('omits stopDatetime while the visit is open, and includes it once closed', () => {
    visitRepo.markDirty(VISIT, db);
    expect(build().body.visits[0]).not.toHaveProperty('stopDatetime');

    visitRepo.closeVisit(VISIT, '2026-11-10 07:00:00', db);
    expect(build().body.visits[0].stopDatetime).toBe('2026-11-10 07:00:00');
  });

  it('resolves the encounter patient from its visit', () => {
    encounterRepo.upsert(
      { uuid: 'e1', visituuid: VISIT, encounter_type_uuid: ENCOUNTER_ADMISSION },
      db,
    );

    const [encounter] = build().body.encounters;

    expect(encounter.patient).toBe(PATIENT);
    expect(encounter.visit).toBe(VISIT);
    expect(encounter.location).toBe(LOCATION);
    expect(encounter.encounterProviders[0].encounterRole).toBe(PROVIDER_ENCOUNTER_ROLE);
  });

  it('sends NO observations on an EMERGENCY encounter', () => {
    encounterRepo.upsert(
      { uuid: 'e1', visituuid: VISIT, encounter_type_uuid: ENCOUNTER_EMERGENCY },
      db,
    );
    obsRepo.insert({ encounteruuid: 'e1', conceptuuid: 'c1', value: '120' }, db);

    const built = build();

    expect(built.body.encounters[0].obs).toEqual([]);
    expect(built.observationsByEncounter.get('e1')).toEqual([]);
  });

  it('drops observations with no value, like the legacy', () => {
    encounterRepo.upsert(
      { uuid: 'e1', visituuid: VISIT, encounter_type_uuid: ENCOUNTER_ADMISSION },
      db,
    );
    const kept = obsRepo.insert({ encounteruuid: 'e1', conceptuuid: 'c1', value: '120' }, db);
    obsRepo.insert({ encounteruuid: 'e1', conceptuuid: 'c2', value: null }, db);

    const built = build();

    expect(built.body.encounters[0].obs.map((entry) => entry.uuid)).toEqual([kept]);
  });

  it('records what was SENT, not what was collected — the ack depends on it', () => {
    encounterRepo.upsert(
      { uuid: 'e1', visituuid: VISIT, encounter_type_uuid: ENCOUNTER_ADMISSION },
      db,
    );
    const kept = obsRepo.insert({ encounteruuid: 'e1', conceptuuid: 'c1', value: '120' }, db);
    obsRepo.insert({ encounteruuid: 'e1', conceptuuid: 'c2', value: null }, db);

    // The dropped one must NOT be marked sent when the encounter is accepted.
    expect(build().observationsByEncounter.get('e1')).toEqual([kept]);
  });

  it('returns four empty arrays when nothing is waiting', () => {
    expect(build().body).toEqual({ patients: [], persons: [], visits: [], encounters: [] });
  });
});
