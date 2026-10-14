import { schema } from '../schema';
import { createTestDb, type TestDb } from './helpers/testDb';

/**
 * Asserts the CONTENTS of joined rows, not that a query returned. Patient A has
 * two visits and B has one, deliberately — a wrong column pairing then yields a
 * visibly wrong count rather than a plausible one. Covers both directions of
 * every relation, plus what a missing or absent row resolves to.
 */

// Sorted uuids, so assertions do not depend on row order.
const ids = (rows: { uuid: string }[]) => rows.map((r) => r.uuid).sort();

// Builds the fixture graph every test runs against. Deliberately dirty.
async function seed(db: TestDb['db']): Promise<void> {
  // Two patients, so a mispaired column cannot look right by coincidence.
  await db.insert(schema.patient).values([{ uuid: 'p1' }, { uuid: 'p2' }]);

  // The asymmetry: p1 owns two visits, p2 owns one.
  await db.insert(schema.visit).values([
    { uuid: 'v1', patientuuid: 'p1' },
    { uuid: 'v2', patientuuid: 'p1' },
    { uuid: 'v3', patientuuid: 'p2' },
  ]);

  // e4 points at a visit that does not exist; e3 has no visit at all.
  await db.insert(schema.encounter).values([
    { uuid: 'e1', visituuid: 'v1' },
    { uuid: 'e2', visituuid: 'v1' },
    { uuid: 'e3' },
    { uuid: 'e4', visituuid: 'GONE' },
  ]);

  // Both hang off e1, leaving e2 and e3 childless on purpose.
  await db.insert(schema.obs).values([
    { uuid: 'o1', encounteruuid: 'e1' },
    { uuid: 'o2', encounteruuid: 'e1' },
  ]);

  // p1 owns two, p2 owns one.
  await db.insert(schema.patientAttribute).values([
    { uuid: 'pa1', patientuuid: 'p1' },
    { uuid: 'pa2', patientuuid: 'p1' },
    { uuid: 'pa3', patientuuid: 'p2' },
  ]);

  // Snake-cased visit_uuid here, unlike tbl_encounter's visituuid.
  await db.insert(schema.visitAttribute).values([
    { uuid: 'va1', visit_uuid: 'v1' },
    { uuid: 'va2', visit_uuid: 'v1' },
    { uuid: 'va3', visit_uuid: 'v3' },
  ]);

  // pr2 stays childless, to prove an empty many() comes back as [].
  await db.insert(schema.provider).values([{ uuid: 'pr1' }, { uuid: 'pr2' }]);

  // Both belong to pr1.
  await db.insert(schema.providerAttribute).values([
    { uuid: 'pra1', provideruuid: 'pr1' },
    { uuid: 'pra2', provideruuid: 'pr1' },
  ]);
}

describe('relations', () => {
  let ctx: TestDb;
  let db: TestDb['db'];

  // Fresh migrated database per test, so no test can see another's rows.
  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
    await seed(db);
  });

  // Frees the WASM heap; without it memory grows across the file.
  afterEach(() => ctx.close());

  // The many() side of patient: everything it owns.
  describe('patient', () => {
    it('owns its visits, partitioned by patientuuid', async () => {
      // Reads both patients at once, so the 2-and-1 split has to hold.
      const rows = await db.query.patient.findMany({ with: { visits: true } });

      expect(ids(rows.find((p) => p.uuid === 'p1')!.visits)).toEqual(['v1', 'v2']);
      expect(ids(rows.find((p) => p.uuid === 'p2')!.visits)).toEqual(['v3']);
    });

    it('owns its attributes', async () => {
      // Same shape as visits: p1 has two, p2 has one.
      const rows = await db.query.patient.findMany({ with: { attributes: true } });

      expect(ids(rows.find((p) => p.uuid === 'p1')!.attributes)).toEqual(['pa1', 'pa2']);
      expect(ids(rows.find((p) => p.uuid === 'p2')!.attributes)).toEqual(['pa3']);
    });
  });

  // The one() side back to patient, and visit's own children.
  describe('visit', () => {
    it('resolves back to its patient', async () => {
      // Every visit at once, so a wrong pairing shows as a wrong owner.
      const rows = await db.query.visit.findMany({ with: { patient: true } });

      expect(rows.map((v) => `${v.uuid}->${v.patient?.uuid}`).sort()).toEqual([
        'v1->p1',
        'v2->p1',
        'v3->p2',
      ]);
    });

    it('owns its attributes and encounters', async () => {
      // Two different many() relations resolved in a single query.
      const rows = await db.query.visit.findMany({ with: { attributes: true, encounters: true } });
      const v1 = rows.find((v) => v.uuid === 'v1');

      expect(ids(v1!.attributes)).toEqual(['va1', 'va2']);
      expect(ids(v1!.encounters)).toEqual(['e1', 'e2']);
    });
  });

  // The relation whose column name differs from every sibling.
  describe('visitAttribute', () => {
    it('resolves back to its visit via visit_uuid', async () => {
      // Snake-cased here but not on tbl_encounter — an easy column to mispair.
      const rows = await db.query.visitAttribute.findMany({ with: { visit: true } });

      expect(rows.map((a) => `${a.uuid}->${a.visit?.uuid}`).sort()).toEqual([
        'va1->v1',
        'va2->v1',
        'va3->v3',
      ]);
    });
  });

  // Encounter sits mid-tree: a parent above, children and a lookup below.
  describe('encounter', () => {
    it('resolves its visit and its observations', async () => {
      // Up and down the tree in one query.
      const rows = await db.query.encounter.findMany({ with: { visit: true, observations: true } });
      const e1 = rows.find((e) => e.uuid === 'e1');

      expect(e1?.visit?.uuid).toBe('v1');
      expect(ids(e1!.observations)).toEqual(['o1', 'o2']);
    });
  });

  // The leaf of the clinical tree.
  describe('obs', () => {
    it('resolves back to its encounter', async () => {
      // Both observations must name the same parent.
      const rows = await db.query.obs.findMany({ with: { encounter: true } });

      expect(rows.map((o) => `${o.uuid}->${o.encounter?.uuid}`).sort()).toEqual([
        'o1->e1',
        'o2->e1',
      ]);
    });
  });

  // The provider branch, unconnected to the patient tree.
  describe('provider', () => {
    it('owns its attributes, and they resolve back', async () => {
      // Both directions of the same relation, asserted together.
      const rows = await db.query.provider.findMany({ with: { attributes: true } });
      const back = await db.query.providerAttribute.findMany({ with: { provider: true } });

      expect(ids(rows.find((p) => p.uuid === 'pr1')!.attributes)).toEqual(['pra1', 'pra2']);
      expect(rows.find((p) => p.uuid === 'pr2')?.attributes).toEqual([]);
      expect(back.every((a) => a.provider?.uuid === 'pr1')).toBe(true);
    });
  });

  // The attribute side of the patient relation.
  describe('patientAttribute', () => {
    it('resolves back to its patient', async () => {
      // Every attribute at once, so a wrong pairing shows as a wrong owner.
      const rows = await db.query.patientAttribute.findMany({ with: { patient: true } });

      expect(rows.map((a) => `${a.uuid}->${a.patient?.uuid}`).sort()).toEqual([
        'pa1->p1',
        'pa2->p1',
        'pa3->p2',
      ]);
    });
  });

  // What a relation yields when the row on the other end is not there.
  describe('missing rows', () => {
    it('gives null for a dangling or absent parent, keeping the row', async () => {
      // e4 points at a visit that never synced, e3 at none at all.
      const rows = await db.query.encounter.findMany({ with: { visit: true } });

      // LEFT JOIN, not INNER — an INNER would drop clinical rows from lists.
      expect(rows).toHaveLength(4);
      expect(rows.find((e) => e.uuid === 'e4')?.visit).toBeNull();
      expect(rows.find((e) => e.uuid === 'e3')?.visit).toBeNull();
    });

    it('gives an empty array, never null, for a childless many()', async () => {
      // Callers may map() the result without a null check.
      const rows = await db.query.encounter.findMany({ with: { observations: true } });

      expect(rows.find((e) => e.uuid === 'e2')?.observations).toEqual([]);
      expect(rows.find((e) => e.uuid === 'e4')?.observations).toEqual([]);
    });
  });

  it('nests three levels deep in one query', async () => {
    // patient -> visits -> encounters -> observations, one SELECT.
    const rows = await db.query.patient.findMany({
      with: { visits: { with: { encounters: { with: { observations: true } } } } },
    });
    const v1 = rows.find((p) => p.uuid === 'p1')?.visits.find((v) => v.uuid === 'v1');

    expect(ids(v1!.encounters)).toEqual(['e1', 'e2']);
    expect(ids(v1!.encounters.find((e) => e.uuid === 'e1')!.observations)).toEqual(['o1', 'o2']);
  });
});
