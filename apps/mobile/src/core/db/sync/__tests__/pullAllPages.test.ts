import { APP_STATE_ID } from '@/core/db/init';
import { appStateRepo } from '@/core/db/repositories';
import { appState, patient } from '@/core/db/schema';
import type { DbHandle } from '@/core/db/tx';
import { createTestDb, type TestDb } from '@/core/db/__tests__/helpers/testDb';

import type { PullPayload } from '../applyPull';
import { pullAllPages } from '../pullAllPages';

/**
 * The page loop. One thing matters above the rest: every page repeats the same
 * `pullexecutedtime`, so the cursor must move once, at the end, and never on a
 * page that still has pages after it.
 */

const EPOCH = '2006-08-22 22:21:48 ';
const STAMP = '2026-11-11 12:48:07';

/** The real body, verbatim — a quiet pull that is already the last page. */
const REAL_LAST_PAGE: PullPayload = {
  pullexecutedtime: STAMP,
  patientlist: [],
  patientAttributesList: [],
  visitlist: [],
  encounterlist: [],
  obslist: [],
  visitAttributeList: [],
  pageNo: -1,
  totalCount: 0,
};

const page = (uuid: string, pageNo: number): PullPayload => ({
  pullexecutedtime: STAMP,
  patientlist: [{ uuid, firstname: 'Asha' }],
  pageNo,
  totalCount: 3,
});

describe('pullAllPages', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
    db.insert(appState).values({ id: APP_STATE_ID }).run();
  });

  afterEach(() => ctx.close());

  const patients = () => ctx.db.select().from(patient).all();

  it('applies the real single-page body and moves the cursor', async () => {
    const fetchPage = jest.fn().mockResolvedValue(REAL_LAST_PAGE);

    const result = await pullAllPages(fetchPage, db);

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(0);
    expect(result.pages).toBe(1);
    expect(result.cursor).toBe(STAMP);
    expect(appStateRepo.getPullCursor(db)).toBe(STAMP);
  });

  it('follows pageNo to the end and moves the cursor exactly once', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page('p1', 1))
      .mockResolvedValueOnce(page('p2', 2))
      .mockResolvedValueOnce(page('p3', -1));

    const result = await pullAllPages(fetchPage, db);

    expect(fetchPage.mock.calls.map(([n]) => n)).toEqual([0, 1, 2]);
    expect(result.pages).toBe(3);
    expect(result.patients).toBe(3);
    expect(patients()).toHaveLength(3);
    expect(appStateRepo.getPullCursor(db)).toBe(STAMP);
  });

  it('does NOT move the cursor on a page that has pages after it', async () => {
    // The defect this loop exists to prevent: page 0 carries the end stamp.
    const fetchPage = jest.fn().mockResolvedValueOnce(page('p1', 1)).mockRejectedValueOnce(
      new Error('network died'),
    );

    await expect(pullAllPages(fetchPage, db)).rejects.toThrow('network died');

    expect(appStateRepo.getPullCursor(db)).toBe(EPOCH);
  });

  it('keeps the pages that landed when a later one fails', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page('p1', 1))
      .mockRejectedValueOnce(new Error('network died'));

    await expect(pullAllPages(fetchPage, db)).rejects.toThrow('network died');

    // Safe only because the cursor stayed put: the next run redoes page 0 and
    // every write is an upsert keyed by uuid.
    expect(patients()).toHaveLength(1);
    expect(appStateRepo.getPullCursor(db)).toBe(EPOCH);
  });

  it('stops loudly when a page points backwards instead of looping forever', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page('p1', 1))
      .mockResolvedValueOnce(page('p2', 1));

    await expect(pullAllPages(fetchPage, db)).rejects.toThrow('pointed back at page 1');

    expect(appStateRepo.getPullCursor(db)).toBe(EPOCH);
  });

  it('treats a response with no pageNo as the only page', async () => {
    const fetchPage = jest.fn().mockResolvedValue({
      pullexecutedtime: STAMP,
      patientlist: [{ uuid: 'p1', firstname: 'Asha' }],
    });

    const result = await pullAllPages(fetchPage, db);

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(result.cursor).toBe(STAMP);
    expect(appStateRepo.getPullCursor(db)).toBe(STAMP);
  });
});
