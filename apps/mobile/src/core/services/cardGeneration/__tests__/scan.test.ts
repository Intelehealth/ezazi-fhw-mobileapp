import { encounterTypeName, encounterTypeUuid } from '@/core/db/constants/encounter';
import { MISSED_ENCOUNTER } from '@/core/db/constants/obs';
import { DECISION_PENDING, VISIT_HOLDER } from '@/core/db/constants/visit';
import { encounterRepo, obsRepo, visitAttributeRepo, visitRepo } from '@/core/db/repositories';
import { obs } from '@/core/db/schema';
import { seedDevPatient } from '@/core/db/seeds/devPatient';
import { DEV_VISIT_UUID } from '@/core/db/seeds/devPatient.data';
import { SYNC_DIRTY, VOIDED_NO } from '@/core/db/syncFlags';
import { transact, type DbHandle } from '@/core/db/tx';
import { createTestDb, type TestDb } from '@/core/db/__tests__/helpers/testDb';
import { utcIsoTimestamp } from '@/core/utils/datetime';

import { scanAllVisits } from '../scan';

/**
 * The minute scan against a real (in-memory) database: Android's CardGenerationEngine
 * creates the next card 30 minutes after the latest, stops at Stage1_Hour15_2 with
 * Decision Pending, and (here, not while drawing) marks an empty older card missed.
 */
const IDENTITY = { providerUuid: 'provider-1', creatorUuid: 'user-1' };
const NOW = Date.UTC(2026, 9, 23, 10, 0, 0);
const MINUTE = 60_000;

const latestName = (db: DbHandle) => {
  const latest = encounterRepo.findLatestClinicalByVisit(DEV_VISIT_UUID, db);
  return latest?.encounter_type_uuid ? encounterTypeName(latest.encounter_type_uuid) : null;
};
const markersOn = (db: DbHandle, encounterUuid: string) =>
  obsRepo.listByEncounter(encounterUuid, db).filter((row) => row.conceptuuid === MISSED_ENCOUNTER).length;

describe('scanAllVisits', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
    // The fake patient: latest card Stage1_Hour2_2, 20 minutes before NOW.
    transact((tx) => seedDevPatient({ providerUuid: IDENTITY.providerUuid, now: NOW }, tx), db);
  });

  afterEach(() => ctx.close());

  it('waits while the latest card is younger than 30 minutes', () => {
    expect(scanAllVisits(IDENTITY, NOW, db)).toEqual({ cardsCreated: 0, decisionPendingSet: 0, missedMarkers: 0, preSyncDue: 0 });
    expect(latestName(db)).toBe('Stage1_Hour2_2');
  });

  it('flags the pre-sync minute, one minute before the next card', () => {
    expect(scanAllVisits(IDENTITY, NOW + 9 * MINUTE, db).preSyncDue).toBe(1);
  });

  it('creates the next card at 30 minutes, with the NORMAL marker, written as the provider and user', () => {
    const result = scanAllVisits(IDENTITY, NOW + 10 * MINUTE, db);

    expect(result.cardsCreated).toBe(1);
    expect(latestName(db)).toBe('Stage1_Hour3_1');
    const card = encounterRepo.findLatestClinicalByVisit(DEV_VISIT_UUID, db)!;
    expect(card).toMatchObject({
      provider_uuid: IDENTITY.providerUuid,
      privacynotice_value: 'true',
      voided: VOIDED_NO,
      sync: SYNC_DIRTY,
    });
    expect(obsRepo.getEncounterTypeValue(card.uuid, db)).toBe('NORMAL');
    // Android's createObs leaves the marker's comment unset.
    expect(obsRepo.listByEncounter(card.uuid, db)[0]).toMatchObject({ creator: 'user-1', creatoruuid: 'user-1', comment: null });
  });

  it('never creates the same card twice when the scan runs again', () => {
    scanAllVisits(IDENTITY, NOW + 10 * MINUTE, db);
    const again = scanAllVisits(IDENTITY, NOW + 10 * MINUTE, db);

    expect(again.cardsCreated).toBe(0);
    expect(encounterRepo.findTimelineByVisit(DEV_VISIT_UUID, db).filter(
      (row) => row.encounter_type_uuid === encounterTypeUuid('Stage1_Hour3_1'),
    )).toHaveLength(1);
  });

  it('marks the card that was due as missed once a newer card exists, and only once', () => {
    const due = encounterRepo.findLatestClinicalByVisit(DEV_VISIT_UUID, db)!.uuid;

    expect(scanAllVisits(IDENTITY, NOW + 10 * MINUTE, db).missedMarkers).toBe(1);
    expect(markersOn(db, due)).toBe(1);
    expect(scanAllVisits(IDENTITY, NOW + 11 * MINUTE, db).missedMarkers).toBe(0);
    expect(markersOn(db, due)).toBe(1);
  });

  it('sets Decision Pending once after the last Stage 1 card, and marks the visit for sync', () => {
    transact((tx) => {
      encounterRepo.insertManyReplacing(
        [{
          uuid: 'last-card',
          visituuid: DEV_VISIT_UUID,
          encounter_time: utcIsoTimestamp(NOW - 5 * MINUTE), // newer than the seeded cards
          encounter_type_uuid: encounterTypeUuid('Stage1_Hour15_2'),
          voided: VOIDED_NO,
        }],
        tx,
      );
      tx.insert(obs).values({ uuid: 'o-last', encounteruuid: 'last-card', conceptuuid: 'x', value: '1', voided: VOIDED_NO }).run();
    }, db);

    expect(scanAllVisits(IDENTITY, NOW + 25 * MINUTE, db).decisionPendingSet).toBe(1);
    expect(visitAttributeRepo.findValue(DEV_VISIT_UUID, DECISION_PENDING, db)).toBe('true');
    expect(visitRepo.findDirty(db).map((v) => v.uuid)).toContain(DEV_VISIT_UUID);
    expect(scanAllVisits(IDENTITY, NOW + 26 * MINUTE, db).decisionPendingSet).toBe(0);
  });

  it("leaves other providers' visits alone", () => {
    expect(visitAttributeRepo.findValue(DEV_VISIT_UUID, VISIT_HOLDER, db)).toBe(IDENTITY.providerUuid);
    expect(scanAllVisits({ ...IDENTITY, providerUuid: 'someone-else' }, NOW + 60 * MINUTE, db).cardsCreated).toBe(0);
  });
});
