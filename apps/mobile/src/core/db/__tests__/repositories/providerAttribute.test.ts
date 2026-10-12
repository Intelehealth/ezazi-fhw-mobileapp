import { eq } from 'drizzle-orm';

import { WARD_LABOR, WARD_POST_NATAL } from '../../constants/literals';
import { FACILITY, PROVIDER_SPECIALITY, PROVIDER_WARD } from '../../constants/provider';
import { findWardForProvider } from '../../repositories/provider';
import {
  findValue,
  listByProvider,
  listSpecialitiesByProvider,
  specialityExists,
  upsertManyFromPull,
  upsertProviderAttribute,
  upsertSpeciality,
  type PulledProviderAttribute,
} from '../../repositories/providerAttribute';
import { drSpeciality, providerAttribute } from '../../schema';
import { VOIDED_NO, VOIDED_YES } from '../../syncFlags';
import type { DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * Two legacy behaviours are deliberately not ported and most of these tests
 * guard one of them: a row voided on the server was never written, so a revoked
 * ward survived on the device forever; and any attribute type outside a
 * three-uuid whitelist was discarded with no else branch and no log.
 */

const PROVIDER = 'p1';

describe('provider attribute repository', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  const attributes = () => ctx.db.select().from(providerAttribute).all();
  const specialities = () => ctx.db.select().from(drSpeciality).all();

  const pulled = (
    uuid: string,
    attributetypeuuid: string,
    value: string,
    voided = VOIDED_NO,
  ): PulledProviderAttribute => ({
    uuid,
    provideruuid: PROVIDER,
    attributetypeuuid,
    value,
    voided,
  });

  describe('routing by attribute type', () => {
    it('sends a speciality to its own table and everything else to the other', () => {
      upsertManyFromPull(
        [
          pulled('s1', PROVIDER_SPECIALITY, 'Obstetrician'),
          pulled('a1', PROVIDER_WARD, WARD_LABOR),
          pulled('a2', FACILITY, 'location-a'),
        ],
        db,
      );

      expect(specialities().map((r) => r.uuid)).toEqual(['s1']);
      expect(attributes().map((r) => r.uuid).sort()).toEqual(['a1', 'a2']);
    });

    it('matches the speciality uuid case-insensitively, as the legacy did', () => {
      upsertManyFromPull([pulled('s1', PROVIDER_SPECIALITY.toUpperCase(), 'Obstetrician')], db);

      expect(specialities()).toHaveLength(1);
      expect(attributes()).toHaveLength(0);
    });

    it('KEEPS an unrecognised attribute type instead of discarding it', () => {
      // The legacy had no else branch: anything outside its three-uuid
      // whitelist vanished with no error and no log.
      upsertManyFromPull([pulled('a1', 'some-future-type', 'value')], db);

      expect(attributes().map((r) => r.uuid)).toEqual(['a1']);
    });
  });

  describe('voided rows', () => {
    it('WRITES a voided row rather than dropping it', () => {
      // The legacy only wrote when voided == 0, so a revoked assignment was
      // never updated and the stale local row survived every later pull.
      upsertManyFromPull([pulled('a1', PROVIDER_WARD, WARD_LABOR, VOIDED_YES)], db);

      expect(attributes()[0]).toMatchObject({ uuid: 'a1', voided: VOIDED_YES });
    });

    it('lets a server-side revocation actually take effect', () => {
      // The whole point of the change above, end to end.
      upsertManyFromPull([pulled('a1', PROVIDER_WARD, WARD_LABOR)], db);
      expect(findWardForProvider(PROVIDER, db)).toBe(WARD_LABOR);

      upsertManyFromPull([pulled('a1', PROVIDER_WARD, WARD_LABOR, VOIDED_YES)], db);
      expect(findWardForProvider(PROVIDER, db)).toBeNull();
    });

    it('hides voided rows from every read', () => {
      upsertManyFromPull(
        [
          pulled('a1', PROVIDER_WARD, WARD_LABOR, VOIDED_YES),
          pulled('s1', PROVIDER_SPECIALITY, 'Obstetrician', VOIDED_YES),
        ],
        db,
      );

      expect(listByProvider(PROVIDER, db)).toEqual([]);
      expect(findValue(PROVIDER, PROVIDER_WARD, db)).toBeNull();
      expect(listSpecialitiesByProvider(PROVIDER, db)).toEqual([]);
      expect(specialityExists('Obstetrician', db)).toBe(false);
    });
  });

  describe('specialities do not behave like attributes', () => {
    it('keeps both providers when two share a speciality name', () => {
      // The legacy declared value TEXT UNIQUE and wrote with REPLACE, so the
      // second write DELETED the first provider's row.
      upsertSpeciality(
        {
          uuid: 's1',
          provideruuid: 'p1',
          attributetypeuuid: PROVIDER_SPECIALITY,
          value: 'Obstetrician',
          voided: VOIDED_NO,
        },
        db,
      );
      upsertSpeciality(
        {
          uuid: 's2',
          provideruuid: 'p2',
          attributetypeuuid: PROVIDER_SPECIALITY,
          value: 'Obstetrician',
          voided: VOIDED_NO,
        },
        db,
      );

      expect(specialities().map((r) => r.provideruuid).sort()).toEqual(['p1', 'p2']);
    });

    it('answers the existence check by name', () => {
      upsertSpeciality(
        {
          uuid: 's1',
          provideruuid: PROVIDER,
          attributetypeuuid: PROVIDER_SPECIALITY,
          value: 'Obstetrician',
          voided: VOIDED_NO,
        },
        db,
      );

      expect(specialityExists('Obstetrician', db)).toBe(true);
      expect(specialityExists('Paediatrician', db)).toBe(false);
    });
  });

  describe('upserts', () => {
    it('updates an existing row by uuid rather than adding a second', () => {
      upsertManyFromPull([pulled('a1', PROVIDER_WARD, WARD_LABOR)], db);
      upsertManyFromPull([pulled('a1', PROVIDER_WARD, WARD_POST_NATAL)], db);

      expect(attributes()).toHaveLength(1);
      expect(attributes()[0].value).toBe(WARD_POST_NATAL);
    });

    it('writes a single attribute directly', () => {
      upsertProviderAttribute(
        {
          uuid: 'a1',
          provideruuid: PROVIDER,
          attributetypeuuid: FACILITY,
          value: 'location-a',
          voided: VOIDED_NO,
        },
        db,
      );

      expect(
        ctx.db.select().from(providerAttribute).where(eq(providerAttribute.uuid, 'a1')).get(),
      ).toMatchObject({ value: 'location-a' });
    });
  });

  describe('reads', () => {
    it('findValue takes the newest row for that type', () => {
      upsertManyFromPull(
        [
          pulled('a1', PROVIDER_WARD, WARD_LABOR),
          pulled('a2', PROVIDER_WARD, WARD_POST_NATAL),
        ],
        db,
      );

      expect(findValue(PROVIDER, PROVIDER_WARD, db)).toBe(WARD_POST_NATAL);
    });

    it('findValue does not confuse one attribute type with another', () => {
      upsertManyFromPull(
        [pulled('a1', PROVIDER_WARD, WARD_LABOR), pulled('a2', FACILITY, 'location-a')],
        db,
      );

      expect(findValue(PROVIDER, PROVIDER_WARD, db)).toBe(WARD_LABOR);
      expect(findValue(PROVIDER, FACILITY, db)).toBe('location-a');
    });

    it('findValue returns null on a miss', () => {
      expect(findValue(PROVIDER, PROVIDER_WARD, db)).toBeNull();
    });

    it('listByProvider is scoped to that provider', () => {
      upsertManyFromPull([pulled('a1', PROVIDER_WARD, WARD_LABOR)], db);
      upsertProviderAttribute(
        {
          uuid: 'a2',
          provideruuid: 'other',
          attributetypeuuid: PROVIDER_WARD,
          value: WARD_LABOR,
          voided: VOIDED_NO,
        },
        db,
      );

      expect(listByProvider(PROVIDER, db).map((r) => r.uuid)).toEqual(['a1']);
    });

    it('listByProvider returns newest first', () => {
      upsertManyFromPull(
        [pulled('a1', PROVIDER_WARD, WARD_LABOR), pulled('a2', FACILITY, 'location-a')],
        db,
      );

      expect(listByProvider(PROVIDER, db).map((r) => r.uuid)).toEqual(['a2', 'a1']);
    });

    it('listSpecialitiesByProvider sorts A-Z', () => {
      // The uuids deliberately sort opposite to the values, so an unordered or
      // uuid-ordered query would flip this. It rendered Z-A until 2026-10-12.
      upsertSpeciality(
        {
          uuid: 'aaa',
          provideruuid: PROVIDER,
          attributetypeuuid: PROVIDER_SPECIALITY,
          value: 'Zebra',
          voided: VOIDED_NO,
        },
        db,
      );
      upsertSpeciality(
        {
          uuid: 'zzz',
          provideruuid: PROVIDER,
          attributetypeuuid: PROVIDER_SPECIALITY,
          value: 'Anaesthetist',
          voided: VOIDED_NO,
        },
        db,
      );

      expect(listSpecialitiesByProvider(PROVIDER, db).map((r) => r.value)).toEqual([
        'Anaesthetist',
        'Zebra',
      ]);
    });

    it('listSpecialitiesByProvider is scoped to that provider', () => {
      upsertManyFromPull([pulled('s1', PROVIDER_SPECIALITY, 'Obstetrician')], db);
      upsertSpeciality(
        {
          uuid: 's2',
          provideruuid: 'other',
          attributetypeuuid: PROVIDER_SPECIALITY,
          value: 'Paediatrician',
          voided: VOIDED_NO,
        },
        db,
      );

      expect(listSpecialitiesByProvider(PROVIDER, db).map((r) => r.uuid)).toEqual(['s1']);
    });
  });
});
