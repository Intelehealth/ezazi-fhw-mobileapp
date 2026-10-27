import { encounterRepo } from '@/core/db/repositories';
import { DEV_VISIT_UUID } from '@/core/db/seeds/devPatient.data';
import { seedDevPatient } from '@/core/db/seeds/devPatient';
import { seedDevLiveVisit, startDevStage1 } from '@/core/db/seeds/devVisitStart';
import { DEV_LIVE_VISIT_UUID } from '@/core/db/seeds/devVisitStart.data';
import { transact, type DbHandle } from '@/core/db/tx';
import { createTestDb, type TestDb } from '@/core/db/__tests__/helpers/testDb';

import { scanAllVisits } from '../scan';

// The seeded test patient's next card fails to write; the live visit must still get its card.
jest.mock('@/core/db/repositories/encounter', () => {
  const actual = jest.requireActual('@/core/db/repositories/encounter');
  return {
    ...actual,
    insertCard: jest.fn((input: { visitUuid: string }, on: unknown) => {
      if (input.visitUuid === 'b7d4f2a0-5c1e-4f3a-9a6b-2d8e7c0f1a02') throw new Error('write failed');
      return actual.insertCard(input, on);
    }),
  };
});
jest.mock('@/core/utils/logger', () => ({ logger: { error: jest.fn(), debug: jest.fn(), info: jest.fn() } }));

const IDENTITY = { providerUuid: 'provider-1', creatorUuid: 'user-1' };
const NOW = Date.UTC(2026, 9, 26, 10, 0, 0);
const MINUTE = 60_000;

/** Deviation (2026-10-27, Kaveri): one failing visit does not stop the others; in Android it aborts the tick. */
describe('scanAllVisits when one visit fails', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
    transact((tx) => {
      seedDevPatient({ providerUuid: IDENTITY.providerUuid, now: NOW }, tx); // next card due at +10 min
      seedDevLiveVisit({ providerUuid: IDENTITY.providerUuid, now: NOW - 30 * MINUTE }, tx);
      startDevStage1({ ...IDENTITY, now: NOW - 30 * MINUTE }, tx); // due at 0
    }, db);
  });

  afterEach(() => ctx.close());

  it('still creates the other visit\'s card', () => {
    expect(DEV_VISIT_UUID).toBe('b7d4f2a0-5c1e-4f3a-9a6b-2d8e7c0f1a02');
    const result = scanAllVisits(IDENTITY, NOW + 10 * MINUTE, db);

    expect(result.cardsCreated).toBe(1);
    expect(encounterRepo.findTimelineByVisit(DEV_LIVE_VISIT_UUID, db)).toHaveLength(2);
  });
});
