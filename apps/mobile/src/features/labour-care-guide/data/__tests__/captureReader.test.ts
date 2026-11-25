import { encounterTypeUuid } from '@/core/db/constants/encounter';
import { encounterRepo } from '@/core/db/repositories';
import { seedDevPatient } from '@/core/db/seeds/devPatient';
import { DEV_VISIT_UUID } from '@/core/db/seeds/devPatient.data';
import { transact, type DbHandle } from '@/core/db/tx';
import { createTestDb, type TestDb } from '@/core/db/__tests__/helpers/testDb';

import { readCaptureCard } from '../captureReader';

const PROVIDER = 'provider-1';
const NOW = Date.UTC(2026, 9, 23, 10, 0, 0);

describe('readCaptureCard', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
    transact((tx) => seedDevPatient({ providerUuid: PROVIDER, now: NOW }, tx), db);
  });

  afterEach(() => ctx.close());

  it('reads a timer card by its name', () => {
    const card = encounterRepo
      .findTimelineByVisit(DEV_VISIT_UUID, db)
      .find((row) => row.encounter_type_uuid === encounterTypeUuid('Stage1_Hour2_2'));

    expect(readCaptureCard(card?.uuid ?? '', db)).toMatchObject({
      cardName: 'Stage1_Hour2_2',
      isSos: false,
      sosLabel: null,
      encounterTime: card?.encounter_time,
    });
  });

  it('reads an SOS card with its label', () => {
    const sos = encounterRepo.findLatestSosByVisit(DEV_VISIT_UUID, db);

    expect(readCaptureCard(sos?.uuid ?? '', db)).toMatchObject({ cardName: null, isSos: true, sosLabel: 'Stage1_Hour2_SOS1' });
  });

  it('reads nothing for an unknown card', () => {
    expect(readCaptureCard('no-such-card', db)).toBeNull();
  });
});
