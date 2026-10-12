import { eq } from 'drizzle-orm';

import {
  PROVIDER_ROLE_DOCTOR,
  PROVIDER_ROLE_NURSE,
  WARD_LABOR,
  WARD_POST_NATAL,
} from '../../constants/literals';
import { FACILITY, PROVIDER_WARD } from '../../constants/provider';
import {
  findAll,
  findNameByUserUuid,
  findNameByUuid,
  findUserUuidByProviderUuid,
  findWardForProvider,
  listDoctorsAtFacility,
  listEncounterAuthors,
  listNursesForWard,
  upsertMany,
} from '../../repositories/provider';
import { encounter, provider, providerAttribute, visit } from '../../schema';
import { SYNC_CLEAN, VOIDED_NO, VOIDED_YES } from '../../syncFlags';
import type { DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * Four legacy behaviours are deliberately NOT ported, and most of these tests
 * exist to stop one being put back: the unfiltered ward lookup, the nurse list
 * that dropped its facility filter, the duplicate-producing doctor join, and
 * the 'Test Doctor' placeholder that shipped as a real clinician name.
 */

const FACILITY_A = 'location-a';
const FACILITY_B = 'location-b';

describe('provider repository', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  const row = (uuid: string) =>
    ctx.db.select().from(provider).where(eq(provider.uuid, uuid)).get();

  const seedProvider = (uuid: string, role: string, extra: Record<string, unknown> = {}) => {
    upsertMany(
      [
        {
          uuid,
          role,
          given_name: uuid.toUpperCase(),
          family_name: 'Surname',
          useruuid: `user-${uuid}`,
          ...extra,
        },
      ],
      db,
    );
    return uuid;
  };

  /** Rows land in call order, so the last one written is the latest by rowid. */
  const seedAttribute = (
    providerUuid: string,
    typeUuid: string,
    value: string,
    voided = VOIDED_NO,
  ) => {
    ctx.db
      .insert(providerAttribute)
      .values({
        uuid: `attr-${providerUuid}-${typeUuid}-${value}-${voided}`,
        provideruuid: providerUuid,
        attributetypeuuid: typeUuid,
        value,
        voided,
      })
      .run();
  };

  const atFacility = (providerUuid: string, location = FACILITY_A) =>
    seedAttribute(providerUuid, FACILITY, location);

  describe('pull-path writes', () => {
    it('writes every row clean — this table has no push path', () => {
      seedProvider('p1', PROVIDER_ROLE_NURSE);

      expect(row('p1')?.sync).toBe(SYNC_CLEAN);
    });

    it("keeps the server's modified_date instead of stamping the device clock", () => {
      // The legacy overwrote it on every pull, which poisons any delta-sync
      // that compares the two.
      seedProvider('p1', PROVIDER_ROLE_NURSE, { modified_date: '2020-01-01' });

      expect(row('p1')?.modified_date).toBe('2020-01-01');
    });

    it('updates by explicit column set, never a whole-row replace', () => {
      seedProvider('p1', PROVIDER_ROLE_NURSE, { identifier: 'ID-1' });
      upsertMany([{ uuid: 'p1', role: PROVIDER_ROLE_DOCTOR, given_name: 'Changed' }], db);

      expect(findAll(db)).toHaveLength(1);
      expect(row('p1')).toMatchObject({ role: PROVIDER_ROLE_DOCTOR, given_name: 'Changed' });
    });
  });

  describe('name lookups', () => {
    it('returns null on a miss, never the "Test Doctor" placeholder', () => {
      // That literal ships to users as a real clinician name in the legacy.
      expect(findNameByUuid('nobody', db)).toBeNull();
      expect(findNameByUserUuid('nobody', db)).toBeNull();
      expect(findUserUuidByProviderUuid('nobody', db)).toBeNull();
    });

    it('keys on uuid and useruuid separately', () => {
      seedProvider('p1', PROVIDER_ROLE_DOCTOR);

      expect(findNameByUuid('p1', db)).toEqual({ given_name: 'P1', family_name: 'Surname' });
      expect(findNameByUserUuid('user-p1', db)).toEqual({
        given_name: 'P1',
        family_name: 'Surname',
      });
      // The uuid is not a useruuid and vice versa.
      expect(findNameByUuid('user-p1', db)).toBeNull();
      expect(findNameByUserUuid('p1', db)).toBeNull();
    });

    it('resolves a provider uuid to its user uuid', () => {
      seedProvider('p1', PROVIDER_ROLE_DOCTOR);

      expect(findUserUuidByProviderUuid('p1', db)).toBe('user-p1');
    });
  });

  describe('the ward lookup', () => {
    it('ignores a facility attribute, which the legacy could return AS the ward', () => {
      // No attributetypeuuid filter in the legacy, last row wins — so a provider
      // holding both attributes could get the facility uuid back as their ward.
      seedProvider('n1', PROVIDER_ROLE_NURSE);
      seedAttribute('n1', PROVIDER_WARD, WARD_LABOR);
      atFacility('n1');

      expect(findWardForProvider('n1', db)).toBe(WARD_LABOR);
    });

    it('ignores a voided ward attribute', () => {
      seedProvider('n1', PROVIDER_ROLE_NURSE);
      seedAttribute('n1', PROVIDER_WARD, WARD_LABOR, VOIDED_YES);

      expect(findWardForProvider('n1', db)).toBeNull();
    });

    it('takes the latest ward row when a provider has moved', () => {
      seedProvider('n1', PROVIDER_ROLE_NURSE);
      seedAttribute('n1', PROVIDER_WARD, WARD_LABOR);
      seedAttribute('n1', PROVIDER_WARD, WARD_POST_NATAL);

      expect(findWardForProvider('n1', db)).toBe(WARD_POST_NATAL);
    });

    it('returns null when the provider has no attributes at all', () => {
      seedProvider('n1', PROVIDER_ROLE_NURSE);

      expect(findWardForProvider('n1', db)).toBeNull();
    });
  });

  describe('doctors at a facility', () => {
    it('returns a doctor once even with two facility rows for that location', () => {
      // The legacy had no DISTINCT, so this returned the same doctor twice in
      // the primary/secondary doctor pickers.
      seedProvider('d1', PROVIDER_ROLE_DOCTOR);
      atFacility('d1');
      ctx.db
        .insert(providerAttribute)
        .values({
          uuid: 'attr-dup',
          provideruuid: 'd1',
          attributetypeuuid: FACILITY,
          value: FACILITY_A,
          voided: VOIDED_NO,
        })
        .run();

      expect(listDoctorsAtFacility(FACILITY_A, db).map((p) => p.uuid)).toEqual(['d1']);
    });

    it('skips a voided facility attribute', () => {
      seedProvider('d1', PROVIDER_ROLE_DOCTOR);
      seedAttribute('d1', FACILITY, FACILITY_A, VOIDED_YES);

      expect(listDoctorsAtFacility(FACILITY_A, db)).toEqual([]);
    });

    it('filters by both role and location', () => {
      seedProvider('d1', PROVIDER_ROLE_DOCTOR);
      atFacility('d1', FACILITY_A);
      seedProvider('d2', PROVIDER_ROLE_DOCTOR);
      atFacility('d2', FACILITY_B);
      seedProvider('n1', PROVIDER_ROLE_NURSE);
      atFacility('n1', FACILITY_A);

      expect(listDoctorsAtFacility(FACILITY_A, db).map((p) => p.uuid)).toEqual(['d1']);
    });

    it('projects the six legacy columns, without sync or voided', () => {
      seedProvider('d1', PROVIDER_ROLE_DOCTOR, { identifier: 'ID-1' });
      atFacility('d1');

      expect(listDoctorsAtFacility(FACILITY_A, db)[0]).toEqual({
        uuid: 'd1',
        identifier: 'ID-1',
        given_name: 'D1',
        family_name: 'Surname',
        role: PROVIDER_ROLE_DOCTOR,
        useruuid: 'user-d1',
      });
    });
  });

  describe('nurses for a ward', () => {
    const seedNurse = (uuid: string, location: string, ward: string | null) => {
      seedProvider(uuid, PROVIDER_ROLE_NURSE);
      atFacility(uuid, location);
      if (ward) seedAttribute(uuid, PROVIDER_WARD, ward);
    };

    it('ALWAYS applies the facility filter, even with no ward exclusion', () => {
      // The legacy's fallback branch dropped both filters and returned every
      // nurse in the database. This is the change most worth guarding.
      seedNurse('here', FACILITY_A, WARD_LABOR);
      seedNurse('elsewhere', FACILITY_B, WARD_LABOR);

      expect(
        listNursesForWard({ facilityLocationUuid: FACILITY_A, excludeWard: null }, db).map(
          (p) => p.uuid,
        ),
      ).toEqual(['here']);
    });

    it('excludes the named ward and keeps the other', () => {
      seedNurse('labor', FACILITY_A, WARD_LABOR);
      seedNurse('postnatal', FACILITY_A, WARD_POST_NATAL);

      expect(
        listNursesForWard({ facilityLocationUuid: FACILITY_A, excludeWard: WARD_LABOR }, db).map(
          (p) => p.uuid,
        ),
      ).toEqual(['postnatal']);
      expect(
        listNursesForWard(
          { facilityLocationUuid: FACILITY_A, excludeWard: WARD_POST_NATAL },
          db,
        ).map((p) => p.uuid),
      ).toEqual(['labor']);
    });

    it('keeps a nurse who has no ward attribute at all', () => {
      seedNurse('unassigned', FACILITY_A, null);

      expect(
        listNursesForWard({ facilityLocationUuid: FACILITY_A, excludeWard: WARD_LABOR }, db).map(
          (p) => p.uuid,
        ),
      ).toEqual(['unassigned']);
    });

    it('judges the exclusion on the LATEST ward row', () => {
      seedNurse('moved', FACILITY_A, WARD_LABOR);
      seedAttribute('moved', PROVIDER_WARD, WARD_POST_NATAL);

      // Excluding the ward they left no longer excludes them.
      expect(
        listNursesForWard({ facilityLocationUuid: FACILITY_A, excludeWard: WARD_LABOR }, db).map(
          (p) => p.uuid,
        ),
      ).toEqual(['moved']);
      expect(
        listNursesForWard(
          { facilityLocationUuid: FACILITY_A, excludeWard: WARD_POST_NATAL },
          db,
        ).map((p) => p.uuid),
      ).toEqual([]);
    });

    it('ignores a voided ward attribute when deciding the exclusion', () => {
      seedProvider('n1', PROVIDER_ROLE_NURSE);
      atFacility('n1');
      seedAttribute('n1', PROVIDER_WARD, WARD_LABOR, VOIDED_YES);

      expect(
        listNursesForWard({ facilityLocationUuid: FACILITY_A, excludeWard: WARD_LABOR }, db).map(
          (p) => p.uuid,
        ),
      ).toEqual(['n1']);
    });

    it('never returns a doctor', () => {
      seedProvider('d1', PROVIDER_ROLE_DOCTOR);
      atFacility('d1');

      expect(
        listNursesForWard({ facilityLocationUuid: FACILITY_A, excludeWard: null }, db),
      ).toEqual([]);
    });

    it('skips a voided facility attribute', () => {
      seedProvider('n1', PROVIDER_ROLE_NURSE);
      seedAttribute('n1', FACILITY, FACILITY_A, VOIDED_YES);

      expect(
        listNursesForWard({ facilityLocationUuid: FACILITY_A, excludeWard: null }, db),
      ).toEqual([]);
    });
  });

  describe('encounter authors', () => {
    const seedAuthored = (providerUuid: string, visitUuid: string, encounterUuid: string) => {
      ctx.db.insert(visit).values({ uuid: visitUuid, patientuuid: 'pt1' }).run();
      ctx.db
        .insert(encounter)
        .values({ uuid: encounterUuid, visituuid: visitUuid, provider_uuid: providerUuid })
        .run();
    };

    it('returns each author once, however many encounters they wrote', () => {
      seedProvider('p1', PROVIDER_ROLE_NURSE);
      seedAuthored('p1', 'v1', 'e1');
      ctx.db
        .insert(encounter)
        .values({ uuid: 'e2', visituuid: 'v1', provider_uuid: 'p1' })
        .run();

      expect(listEncounterAuthors(db)).toEqual([
        { uuid: 'p1', given_name: 'P1', family_name: 'Surname' },
      ]);
    });

    it('skips a provider who has authored nothing', () => {
      seedProvider('p1', PROVIDER_ROLE_NURSE);

      expect(listEncounterAuthors(db)).toEqual([]);
    });

    it('skips an encounter whose visit does not exist', () => {
      // The legacy joined tbl_visit for exactly this reason.
      seedProvider('p1', PROVIDER_ROLE_NURSE);
      ctx.db
        .insert(encounter)
        .values({ uuid: 'orphan', visituuid: 'missing', provider_uuid: 'p1' })
        .run();

      expect(listEncounterAuthors(db)).toEqual([]);
    });

    it('orders by name, so the result is not two unpaired arrays', () => {
      // The legacy ran this query twice — once for names, once for uuids — with
      // no ORDER BY, and zipped the two results by index.
      upsertMany(
        [
          { uuid: 'pz', given_name: 'Zoe', family_name: 'Z', role: PROVIDER_ROLE_NURSE },
          { uuid: 'pa', given_name: 'Ana', family_name: 'A', role: PROVIDER_ROLE_NURSE },
        ],
        db,
      );
      seedAuthored('pz', 'v1', 'e1');
      seedAuthored('pa', 'v2', 'e2');

      expect(listEncounterAuthors(db).map((p) => p.uuid)).toEqual(['pa', 'pz']);
    });
  });
});
