import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import { schema } from '../schema';
import { migrations } from '../migrations';
import { modelClasses } from '../models';
import Patient from '../models/Patient';
import Visit from '../models/Visit';
import Encounter from '../models/Encounter';
import Obs from '../models/Obs';
import Location from '../models/Location';
import Provider from '../models/Provider';
import UuidDictionary from '../models/UuidDictionary';
import UserCredentials from '../models/UserCredentials';

// In-memory LokiJS database — no native SQLite needed for unit tests
function makeTestDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
  });
  return new Database({ adapter, modelClasses });
}

describe('WatermelonDB Database', () => {
  let db: Database;

  beforeEach(() => {
    db = makeTestDatabase();
  });

  it('creates a Database instance', () => {
    expect(db).toBeInstanceOf(Database);
  });

  it('exposes all 15 table collections', () => {
    const tables = [
      'tbl_patient', 'tbl_patient_attribute', 'tbl_patient_attribute_master',
      'tbl_visit', 'tbl_visit_attribute', 'tbl_encounter', 'tbl_obs',
      'tbl_location', 'tbl_provider', 'tbl_provider_attribute',
      'tbl_dr_speciality', 'tbl_uuid_dictionary', 'tbl_image_records',
      'tbl_user_credentials', 'tbl_rtc_connection_log',
    ];
    tables.forEach((t) => expect(db.get(t)).toBeDefined());
  });

  describe('Patient CRUD', () => {
    it('creates a patient record', async () => {
      const patient = await db.write(async () =>
        db.get<Patient>('tbl_patient').create((p) => {
          p.first_name = 'Sunita';
          p.last_name  = 'Devi';
          p.gender     = 'F';
          p.voided     = '0';
          p.sync       = 'false';
        }),
      );
      expect(patient.id).toBeTruthy();
      expect(patient.first_name).toBe('Sunita');
      expect(patient.last_name).toBe('Devi');
      expect(patient.voided).toBe('0');
      expect(patient.sync).toBe('false');
    });

    it('queries all patients', async () => {
      await db.write(async () => {
        await db.get<Patient>('tbl_patient').create((p) => {
          p.first_name = 'Anita'; p.voided = '0'; p.sync = 'false';
        });
        await db.get<Patient>('tbl_patient').create((p) => {
          p.first_name = 'Geeta'; p.voided = '0'; p.sync = 'false';
        });
      });
      const all = await db.get<Patient>('tbl_patient').query().fetch();
      expect(all.length).toBe(2);
    });

    it('updates a patient record', async () => {
      const patient = await db.write(async () =>
        db.get<Patient>('tbl_patient').create((p) => {
          p.first_name = 'Rama'; p.voided = '0'; p.sync = 'false';
        }),
      );
      await db.write(async () =>
        patient.update((p) => { p.first_name = 'Rani'; }),
      );
      expect(patient.first_name).toBe('Rani');
    });

    it('deletes a patient record', async () => {
      const patient = await db.write(async () =>
        db.get<Patient>('tbl_patient').create((p) => {
          p.first_name = 'ToDelete'; p.voided = '0'; p.sync = 'false';
        }),
      );
      await db.write(async () => patient.destroyPermanently());
      const all = await db.get<Patient>('tbl_patient').query().fetch();
      expect(all.length).toBe(0);
    });
  });

  describe('Visit → Patient relation', () => {
    it('creates a visit linked to a patient', async () => {
      const { patient, visit } = await db.write(async () => {
        const p = await db.get<Patient>('tbl_patient').create((r) => {
          r.first_name = 'Priya'; r.voided = '0'; r.sync = 'false';
        });
        const v = await db.get<Visit>('tbl_visit').create((r) => {
          r.patientuuid  = p.id;
          r.startdate    = '2024-01-01';
          r.isdownloaded = 'false';
          r.voided       = '0';
          r.sync         = 'false';
          r.issubmitted  = 0;
        });
        return { patient: p, visit: v };
      });
      expect(visit.patientuuid).toBe(patient.id);
    });
  });

  describe('Encounter → Visit → Obs chain', () => {
    it('creates the full obs chain', async () => {
      const { obs } = await db.write(async () => {
        const patient = await db.get<Patient>('tbl_patient').create((r) => {
          r.first_name = 'Maya'; r.voided = '0'; r.sync = 'false';
        });
        const visit = await db.get<Visit>('tbl_visit').create((r) => {
          r.patientuuid = patient.id; r.isdownloaded = 'false';
          r.voided = '0'; r.sync = 'false'; r.issubmitted = 0;
        });
        const encounter = await db.get<Encounter>('tbl_encounter').create((r) => {
          r.visituuid = visit.id; r.sync = 'false'; r.voided = '0';
        });
        const obs = await db.get<Obs>('tbl_obs').create((r) => {
          r.encounteruuid = encounter.id;
          r.conceptuuid   = '5090AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
          r.value         = '165';
          r.voided        = '0';
          r.sync          = 'false';
        });
        return { obs };
      });
      expect(obs.value).toBe('165');
      expect(obs.conceptuuid).toBe('5090AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
      expect(obs.voided).toBe('0');
    });
  });

  describe('Location (locationuuid as id)', () => {
    it('stores locationuuid as WatermelonDB id', async () => {
      const locationUuid = 'loc-uuid-1234';
      const loc = await db.write(async () =>
        db.get<Location>('tbl_location').create((r) => {
          r._raw.id    = locationUuid;
          r.name       = 'District Hospital';
          r.voided     = '0';
          r.sync       = 'false';
        }),
      );
      expect(loc.id).toBe(locationUuid);
      expect(loc.locationuuid).toBe(locationUuid);
      expect(loc.name).toBe('District Hospital');
    });
  });

  describe('Provider → ProviderAttribute chain', () => {
    it('creates provider with attributes', async () => {
      const { provider, attr } = await db.write(async () => {
        const provider = await db.get<Provider>('tbl_provider').create((r) => {
          r.given_name  = 'Dr. Raj';
          r.family_name = 'Kumar';
          r.role        = 'Doctor';
          r.voided      = '0';
          r.sync        = 'false';
        });
        const attr = await db.get('tbl_provider_attribute').create((r: any) => {
          r.provideruuid      = provider.id;
          r.attributetypeuuid = 'some-type-uuid';
          r.value             = 'Cardiology';
        });
        return { provider, attr };
      });
      expect(attr.provideruuid).toBe(provider.id);
    });
  });

  describe('UuidDictionary seed data', () => {
    it('stores uuid as WatermelonDB id', async () => {
      const uuid = '5090AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const entry = await db.write(async () =>
        db.get<UuidDictionary>('tbl_uuid_dictionary').create((r) => {
          r._raw.id = uuid;
          r.name    = 'HEIGHT';
        }),
      );
      expect(entry.id).toBe(uuid);
      expect(entry.uuid).toBe(uuid);
      expect(entry.name).toBe('HEIGHT');
    });

    it('does not duplicate entry on second insert with same id', async () => {
      const uuid = '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      await db.write(async () =>
        db.get<UuidDictionary>('tbl_uuid_dictionary').create((r) => {
          r._raw.id = uuid; r.name = 'WEIGHT';
        }),
      );
      const all = await db.get<UuidDictionary>('tbl_uuid_dictionary').query().fetch();
      expect(all.length).toBe(1);
    });
  });

  describe('UserCredentials (no uuid PK in Android)', () => {
    it('auto-generates WatermelonDB id', async () => {
      const cred = await db.write(async () =>
        db.get<UserCredentials>('tbl_user_credentials').create((r) => {
          r.username = 'asha_worker';
          r.password = 'hashed_pw';
          r.chwname  = 'Asha Devi';
        }),
      );
      expect(cred.id).toBeTruthy();
      expect(cred.username).toBe('asha_worker');
    });
  });
});
