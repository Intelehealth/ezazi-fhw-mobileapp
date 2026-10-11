import { schema } from '../schema';
import { transact, type DbHandle } from '../tx';
import { createTestDb, type TestDb } from './helpers/testDb';

/**
 * The seam every repository composes through. An async callback cannot reach
 * these — `Synchronous<T>` rejects it at compile time — so what is left to pin
 * is commit, rollback, and that nesting uses a SAVEPOINT rather than a second
 * BEGIN, which SQLite would reject.
 */

describe('transact', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  const patients = () => ctx.client.exec('SELECT count(*) FROM tbl_patient')[0].values[0][0];
  const insert = (tx: DbHandle, uuid: string) =>
    tx.insert(schema.patient).values({ uuid }).run();

  it('commits every write when the callback returns', () => {
    transact((tx) => {
      insert(tx, 'p1');
      insert(tx, 'p2');
    }, db);

    expect(patients()).toBe(2);
  });

  it('rolls back every write when the callback throws', () => {
    // Partial clinical writes must not survive. The throw still reaches us.
    expect(() =>
      transact((tx) => {
        insert(tx, 'p1');
        throw new Error('boom');
      }, db),
    ).toThrow('boom');

    expect(patients()).toBe(0);
  });

  it('returns whatever the callback returns', () => {
    const uuid = transact((tx) => {
      insert(tx, 'p1');
      return 'p1';
    }, db);

    expect(uuid).toBe('p1');
  });

  it('nests through a savepoint, so the outer transaction survives', () => {
    // A second BEGIN would throw; drizzle issues SAVEPOINT for an inner tx.
    transact((outer) => {
      insert(outer, 'p1');
      transact((inner) => insert(inner, 'p2'), outer);
    }, db);

    expect(patients()).toBe(2);
  });

  it('rolls the whole tree back when an inner transaction throws', () => {
    expect(() =>
      transact((outer) => {
        insert(outer, 'p1');
        transact(() => {
          throw new Error('inner failed');
        }, outer);
      }, db),
    ).toThrow('inner failed');

    expect(patients()).toBe(0);
  });

  it('lets a repository function run standalone or inside a transaction', () => {
    // The whole point of DbHandle: one signature, both call sites.
    const createPatient = (uuid: string, on: DbHandle) => insert(on, uuid);

    createPatient('standalone', db);
    transact((tx) => createPatient('composed', tx), db);

    expect(patients()).toBe(2);
  });
});
