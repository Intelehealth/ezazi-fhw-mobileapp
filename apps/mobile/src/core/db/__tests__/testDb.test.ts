import { is } from 'drizzle-orm';
import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core';

import { patient, schema } from '../schema';
import { SYNC_DIRTY, VOIDED_NO } from '../syncFlags';
import { createTestDb, type TestDb } from './helpers/testDb';

/**
 * Proves the jest engine before anything is built on it, and guards the seam
 * between `schema.ts` and the generated `drizzle/` bundle: these fail if
 * someone edits the schema without re-running `drizzle-kit generate`.
 */

const declaredTables = Object.values(schema)
  .filter((t) => is(t, SQLiteTable))
  .map((t) => getTableConfig(t).name)
  .sort();

describe('test database', () => {
  let ctx: TestDb;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(() => ctx.close());

  it('creates every table declared in schema.ts', () => {
    const created = (
      ctx.client.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations'",
      )[0]?.values ?? []
    )
      .flat()
      .sort();

    expect(created).toEqual(declaredTables);
  });

  it('creates the indexes the sync engine scans on', () => {
    // schema.ts declaring an index proves nothing if drizzle/ was not regenerated.
    const [[count]] = ctx.client.exec(
      "SELECT count(*) FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'",
    )[0].values;

    expect(count).toBe(23);
  });

  it('round-trips the sync and voided defaults through real SQLite', async () => {
    await ctx.db.insert(patient).values({ uuid: 'p1' });

    const [row] = await ctx.db.select().from(patient);
    expect(row.sync).toBe(SYNC_DIRTY);
    expect(row.voided).toBe(VOIDED_NO);
  });

  it('isolates databases, so one test cannot see another’s rows', async () => {
    await ctx.db.insert(patient).values({ uuid: 'p1' });
    const other = await createTestDb();

    await expect(other.db.select().from(patient)).resolves.toEqual([]);
    other.close();
  });
});
