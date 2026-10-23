import { seedDevPatient } from '@/core/db/seeds/devPatient';
import { DEV_PATIENT, DEV_VISIT_UUID } from '@/core/db/seeds/devPatient.data';
import { transact, type DbHandle } from '@/core/db/tx';
import { createTestDb, type TestDb } from '@/core/db/__tests__/helpers/testDb';

import { buildCheckpoints } from '../../domain/timelineModel';
import { readTimeline } from '../timelineReader';

const PROVIDER = 'provider-1';
const NOW = Date.UTC(2026, 9, 23, 10, 0, 0);

describe('readTimeline', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
    transact((tx) => seedDevPatient({ providerUuid: PROVIDER, now: NOW }, tx), db);
  });

  afterEach(() => ctx.close());

  it('reads the patient header, with gravida from the Admission obs', () => {
    expect(readTimeline(DEV_VISIT_UUID, PROVIDER, db).patient).toMatchObject({
      patientUuid: DEV_PATIENT.uuid,
      openmrsId: DEV_PATIENT.openmrsId,
      firstName: DEV_PATIENT.firstName,
      lastName: DEV_PATIENT.lastName,
      gravida: '1',
    });
  });

  it('shows the fake patient as completed, completed, missed, SOS, due and upcoming', () => {
    const snapshot = readTimeline(DEV_VISIT_UUID, PROVIDER, db);

    expect(buildCheckpoints(snapshot.cards, snapshot.visit, NOW).map((c) => c.status)).toEqual([
      'completed', 'completed', 'missed', 'sosCaptured', 'dueNow', 'upcoming',
    ]);
    expect(snapshot.currentCardName).toBe('Stage1_Hour2_2');
  });

  it('knows whether the logged-in provider holds the visit', () => {
    expect(readTimeline(DEV_VISIT_UUID, PROVIDER, db).visit.isVisitHolder).toBe(true);
    expect(readTimeline(DEV_VISIT_UUID, 'someone-else', db).visit.isVisitHolder).toBe(false);
    expect(readTimeline(DEV_VISIT_UUID, null, db).visit.isVisitHolder).toBe(false);
  });

  it('dates a completed card by its newest observation', () => {
    const first = readTimeline(DEV_VISIT_UUID, PROVIDER, db).cards[0];
    expect(first.hasRealObs).toBe(true);
    expect(first.recordedAt).toBe('2026-10-23 08:00:00');
  });
});
