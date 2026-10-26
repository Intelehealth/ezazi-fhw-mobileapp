import { encounterTypeName } from '@/core/db/constants/encounter';
import { encounterRepo, obsRepo } from '@/core/db/repositories';
import { seedDevLiveVisit, startDevStage1 } from '@/core/db/seeds/devVisitStart';
import { DEV_LIVE_VISIT_UUID } from '@/core/db/seeds/devVisitStart.data';
import { transact, type DbHandle } from '@/core/db/tx';
import { createTestDb, type TestDb } from '@/core/db/__tests__/helpers/testDb';

import { scanAllVisits } from '../scan';

/**
 * The engine taking over a visit that has only just started (Stage1_Hour1_1, no obs): what the
 * live test patient goes through on the device, minute by minute.
 */
const IDENTITY = { providerUuid: 'provider-1', creatorUuid: 'user-1' };
const NOW = Date.UTC(2026, 9, 26, 10, 0, 0);
const MINUTE = 60_000;

const cardNames = (db: DbHandle) =>
  encounterRepo
    .findTimelineByVisit(DEV_LIVE_VISIT_UUID, db)
    .map((row) => encounterTypeName(row.encounter_type_uuid ?? ''));

describe('scanAllVisits on a just-started visit', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
    transact((tx) => {
      seedDevLiveVisit({ providerUuid: IDENTITY.providerUuid, now: NOW }, tx);
      startDevStage1({ providerUuid: IDENTITY.providerUuid, now: NOW }, tx);
    }, db);
  });

  afterEach(() => ctx.close());

  it('creates nothing for the first 29 minutes, flagging the pre-sync at 29', () => {
    for (let minute = 1; minute < 29; minute += 1) {
      expect(scanAllVisits(IDENTITY, NOW + minute * MINUTE, db).cardsCreated).toBe(0);
    }
    expect(scanAllVisits(IDENTITY, NOW + 29 * MINUTE, db).preSyncDue).toBe(1);
    expect(cardNames(db)).toEqual(['Stage1_Hour1_1']);
  });

  it('creates Stage1_Hour1_2 at 30 minutes, and marks the unfilled first card missed', () => {
    const first = encounterRepo.findLatestClinicalByVisit(DEV_LIVE_VISIT_UUID, db)!.uuid;
    const result = scanAllVisits(IDENTITY, NOW + 30 * MINUTE, db);

    expect(result).toMatchObject({ cardsCreated: 1, missedMarkers: 1 });
    expect(cardNames(db)).toEqual(['Stage1_Hour1_1', 'Stage1_Hour1_2']);
    expect(obsRepo.hasDataObs(first, db)).toBe(true);
    expect(obsRepo.hasRealObs(first, db)).toBe(false);
  });

  it('keeps the rolling 30-minute schedule from each new card', () => {
    scanAllVisits(IDENTITY, NOW + 30 * MINUTE, db);
    expect(scanAllVisits(IDENTITY, NOW + 59 * MINUTE, db).cardsCreated).toBe(0);
    expect(scanAllVisits(IDENTITY, NOW + 60 * MINUTE, db).cardsCreated).toBe(1);

    expect(cardNames(db)).toEqual(['Stage1_Hour1_1', 'Stage1_Hour1_2', 'Stage1_Hour2_1']);
  });
});
