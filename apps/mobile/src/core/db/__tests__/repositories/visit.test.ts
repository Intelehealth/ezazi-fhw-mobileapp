import { eq } from 'drizzle-orm';

import { ENCOUNTER_VISIT_COMPLETE, ENCOUNTER_VITALS } from '../../constants/encounter';
import { VISIT_HOLDER, VISIT_RISK } from '../../constants/visit';
import {
  closeVisit,
  create,
  findActiveVisitUuid,
  findActiveVisitsByProvider,
  findAll,
  findDirty,
  findPatientUuidByVisit,
  hasProviderAccess,
  isVisitActive,
  markDirty,
  markSynced,
  upsertManyFromServer,
} from '../../repositories/visit';
import { encounter, visit, visitAttribute } from '../../schema';
import { SYNC_CLEAN, SYNC_DIRTY, VOIDED_NO, VOIDED_YES } from '../../syncFlags';
import { transact, type DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * The three conditions that make a visit "open" and the provider-ownership
 * predicate — the legacy spelt each of those three different ways and the
 * spellings disagreed, so a visit could be a patient's active visit and absent
 * from the active list at the same time.
 */

const PROVIDER = 'provider-1';

describe('visit repository', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  const row = (uuid: string) => ctx.db.select().from(visit).where(eq(visit.uuid, uuid)).get();

  /** An open visit held by PROVIDER, which each test then spoils one way. */
  const openVisit = (uuid: string, startdate = '2026-01-01', patientuuid = 'p1') => {
    create({ uuid, patientuuid, startdate }, db);
    ctx.db
      .insert(visitAttribute)
      .values({
        uuid: `va-${uuid}`,
        visit_uuid: uuid,
        visit_attribute_type_uuid: VISIT_HOLDER,
        value: PROVIDER,
      })
      .run();
  };

  const completeVisit = (uuid: string, voided = VOIDED_NO) => {
    ctx.db
      .insert(encounter)
      .values({
        uuid: `e-${uuid}`,
        visituuid: uuid,
        encounter_type_uuid: ENCOUNTER_VISIT_COMPLETE,
        voided,
      })
      .run();
  };

  describe('open-visit predicate', () => {
    it('treats a fresh visit as open', () => {
      openVisit('v1');

      expect(findActiveVisitUuid('p1', db)).toBe('v1');
    });

    it('closes it once an end date is set', () => {
      openVisit('v1');
      closeVisit('v1', '2026-01-02', db);

      expect(findActiveVisitUuid('p1', db)).toBeNull();
    });

    it('closes it once voided', () => {
      openVisit('v1');
      ctx.db.update(visit).set({ voided: VOIDED_YES }).where(eq(visit.uuid, 'v1')).run();

      expect(findActiveVisitUuid('p1', db)).toBeNull();
    });

    it('closes it once a completion encounter exists', () => {
      // The third condition, and the one neither of the other two implies.
      openVisit('v1');
      completeVisit('v1');

      expect(findActiveVisitUuid('p1', db)).toBeNull();
    });

    it('ignores a VOIDED completion encounter', () => {
      openVisit('v1');
      completeVisit('v1', VOIDED_YES);

      expect(findActiveVisitUuid('p1', db)).toBe('v1');
    });

    it('ignores a non-completion encounter', () => {
      openVisit('v1');
      ctx.db
        .insert(encounter)
        .values({ uuid: 'e1', visituuid: 'v1', encounter_type_uuid: ENCOUNTER_VITALS })
        .run();

      expect(findActiveVisitUuid('p1', db)).toBe('v1');
    });

    it('treats an empty-string end date as open, like NULL', () => {
      // Pulled rows carry '', local writes carry NULL; both mean open.
      create({ uuid: 'v1', patientuuid: 'p1', enddate: '' }, db);

      expect(findActiveVisitUuid('p1', db)).toBe('v1');
    });

    it('returns the most recent open visit, not an arbitrary one', () => {
      // The method this replaces had no ORDER BY and returned whatever came out.
      openVisit('older', '2026-01-01');
      openVisit('newer', '2026-06-01');

      expect(findActiveVisitUuid('p1', db)).toBe('newer');
    });
  });

  describe('provider ownership', () => {
    it('grants access to the VISIT_HOLDER', () => {
      openVisit('v1');

      expect(hasProviderAccess('v1', PROVIDER, db)).toBe(true);
    });

    it('denies an attribute of the wrong type with a matching value', () => {
      // The legacy omitted the type filter, so ANY attribute whose value
      // equalled the provider uuid granted edit access. An authorisation hole.
      create({ uuid: 'v1', patientuuid: 'p1' }, db);
      ctx.db
        .insert(visitAttribute)
        .values({
          uuid: 'va1',
          visit_uuid: 'v1',
          visit_attribute_type_uuid: VISIT_RISK,
          value: PROVIDER,
        })
        .run();

      expect(hasProviderAccess('v1', PROVIDER, db)).toBe(false);
    });

    it('denies a different provider', () => {
      openVisit('v1');

      expect(hasProviderAccess('v1', 'someone-else', db)).toBe(false);
    });
  });

  describe('the active-visit reads agree with each other', () => {
    it('lists exactly the visits isVisitActive accepts', () => {
      // The legacy's two spellings disagreed on a visit voided as 'false'.
      openVisit('open-held', '2026-02-01');
      openVisit('closed-held', '2026-03-01');
      completeVisit('closed-held');
      create({ uuid: 'open-unheld', patientuuid: 'p1' }, db);

      const listed = findActiveVisitsByProvider(PROVIDER, db).map((v) => v.uuid);

      expect(listed).toEqual(['open-held']);
      for (const uuid of ['open-held', 'closed-held', 'open-unheld']) {
        expect(isVisitActive(uuid, PROVIDER, db)).toBe(listed.includes(uuid));
      }
    });

    it('separates ownership from openness', () => {
      // hasProviderAccess says nothing about open; isVisitActive needs both.
      openVisit('v1');
      completeVisit('v1');

      expect(hasProviderAccess('v1', PROVIDER, db)).toBe(true);
      expect(isVisitActive('v1', PROVIDER, db)).toBe(false);
    });
  });

  describe('writes', () => {
    it('creates visits dirty and pulled visits clean', () => {
      create({ uuid: 'local', patientuuid: 'p1' }, db);
      upsertManyFromServer([{ uuid: 'pulled', patientuuid: 'p1' }], db);

      expect(row('local')?.sync).toBe(SYNC_DIRTY);
      expect(row('pulled')?.sync).toBe(SYNC_CLEAN);
    });

    it('does not reset columns the server omitted', () => {
      // The legacy replaced the whole row, so a server-voided visit came back
      // un-voided and issubmitted reset, on every re-sync.
      upsertManyFromServer([{ uuid: 'v1', patientuuid: 'p1', voided: VOIDED_YES }], db);
      upsertManyFromServer([{ uuid: 'v1', patientuuid: 'p1', startdate: '2026-02-01' }], db);

      expect(row('v1')).toMatchObject({ startdate: '2026-02-01', voided: VOIDED_YES });
    });

    it('rejects a duplicate uuid rather than replacing', () => {
      create({ uuid: 'v1', patientuuid: 'p1' }, db);

      expect(() => create({ uuid: 'v1', patientuuid: 'p2' }, db)).toThrow();
    });

    it('flags the visit dirty in the same statement that closes it', () => {
      // Miss this and the closure never reaches the server.
      openVisit('v1');
      markSynced('v1', db);
      closeVisit('v1', '2026-01-02', db);

      expect(row('v1')).toMatchObject({ enddate: '2026-01-02', sync: SYNC_DIRTY });
    });

    it('refuses a blank end date instead of reporting a silent success', () => {
      openVisit('v1');

      expect(() => closeVisit('v1', '', db)).toThrow('requires an end date');
      expect(row('v1')?.enddate).toBeNull();
    });

    it('round-trips the dirty flag', () => {
      create({ uuid: 'v1', patientuuid: 'p1' }, db);
      markSynced('v1', db);
      expect(row('v1')?.sync).toBe(SYNC_CLEAN);

      markDirty('v1', db);
      expect(row('v1')?.sync).toBe(SYNC_DIRTY);
    });
  });

  describe('reads', () => {
    it('returns dirty visits with their attributes in one query', () => {
      openVisit('v1');
      upsertManyFromServer([{ uuid: 'clean', patientuuid: 'p1' }], db);

      const dirty = findDirty(db);
      expect(dirty.map((v) => v.uuid)).toEqual(['v1']);
      expect(dirty[0].attributes.map((a) => a.visit_attribute_type_uuid)).toEqual([VISIT_HOLDER]);
    });

    it('pushes voided visits too — no voided filter on the dirty read', () => {
      create({ uuid: 'v1', patientuuid: 'p1', voided: VOIDED_YES }, db);

      expect(findDirty(db).map((v) => v.uuid)).toEqual(['v1']);
    });

    it('orders findAll newest first', () => {
      create({ uuid: 'older', patientuuid: 'p1', startdate: '2026-01-01' }, db);
      create({ uuid: 'newer', patientuuid: 'p1', startdate: '2026-06-01' }, db);

      expect(findAll(db).map((v) => v.uuid)).toEqual(['newer', 'older']);
    });

    it('maps a visit back to its patient', () => {
      create({ uuid: 'v1', patientuuid: 'p1' }, db);

      expect(findPatientUuidByVisit('v1', db)).toBe('p1');
      expect(findPatientUuidByVisit('ghost', db)).toBeNull();
    });
  });

  it('composes with other writes in one transaction', () => {
    expect(() =>
      transact((tx) => {
        create({ uuid: 'v1', patientuuid: 'p1' }, tx);
        closeVisit('v1', '2026-01-02', tx);
        throw new Error('later step failed');
      }, db),
    ).toThrow('later step failed');

    expect(row('v1')).toBeUndefined();
  });
});
