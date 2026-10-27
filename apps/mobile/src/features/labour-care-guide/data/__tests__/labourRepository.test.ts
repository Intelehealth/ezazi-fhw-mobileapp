import { FIELD_ID, STAGE1_OUTCOME } from '@ezazi/clinical-rules';

import { encounterTypeName } from '@/core/db/constants/encounter';
import { BASELINE_FHR, REFER_TYPE } from '@/core/db/constants/obs';
import { DECISION_PENDING, VISIT_READ_STATUS, VISIT_RISK } from '@/core/db/constants/visit';
import { encounterRepo, obsRepo, visitAttributeRepo, visitRepo } from '@/core/db/repositories';
import { seedDevPatient } from '@/core/db/seeds/devPatient';
import { DEV_VISIT_UUID } from '@/core/db/seeds/devPatient.data';
import { SYNC_DIRTY, VOIDED_YES } from '@/core/db/syncFlags';
import { transact, type DbHandle } from '@/core/db/tx';
import { createTestDb, type TestDb } from '@/core/db/__tests__/helpers/testDb';

import { captureSos, endStage1, saveCard } from '../labourRepository';

const WRITER = { providerUuid: 'provider-1', creatorUuid: 'user-1' };
const NOW = Date.UTC(2026, 9, 23, 10, 0, 0);
const NO = { answer: 'no' as const, entry: {} };

describe('labour repository', () => {
  let ctx: TestDb;
  let db: DbHandle;
  let dueCard: string;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
    transact((tx) => seedDevPatient({ providerUuid: WRITER.providerUuid, now: NOW }, tx), db);
    dueCard = encounterRepo.findLatestClinicalByVisit(DEV_VISIT_UUID, db)!.uuid; // Stage1_Hour2_2, empty
  });

  afterEach(() => ctx.close());

  const save = (fhr: string) =>
    saveCard(
      {
        visitUuid: DEV_VISIT_UUID,
        encounterUuid: dueCard,
        card: {
          values: { [FIELD_ID.BASELINE_FHR]: fhr },
          [FIELD_ID.OXYTOCIN]: NO,
          [FIELD_ID.IV_FLUIDS]: NO,
          [FIELD_ID.MEDICINE]: { answer: 'no', medicines: [] },
        },
        writer: WRITER,
        now: NOW,
      },
      db,
    );

  describe('saveCard', () => {
    it('writes the card with alert codes as the user, and marks it for sync', () => {
      expect(save('165')).toEqual({ inserted: 4, voided: 0 });

      const fhr = obsRepo.listByEncounter(dueCard, db).find((row) => row.conceptuuid === BASELINE_FHR)!;
      expect(fhr).toMatchObject({ value: '165', comment: 'R', creator: 'user-1', creatoruuid: 'user-1' });
      expect(obsRepo.hasRealObs(dueCard, db)).toBe(true);
      expect(encounterRepo.findUnsynced(db).map((row) => row.uuid)).toContain(dueCard);
    });

    it('refreshes VISIT_RISK after the save, as Android, and marks the visit for sync', () => {
      save('165'); // FHR red (1) + the seeded BP pair, both red (counted once: 1)
      expect(visitAttributeRepo.findValue(DEV_VISIT_UUID, VISIT_RISK, db)).toBe('2.0');
      expect(visitRepo.findDirty(db).map((v) => v.uuid)).toContain(DEV_VISIT_UUID);
    });

    it('marks the visit for sync and read on every save, as Android, even when the risk is unchanged', () => {
      save('150');
      visitRepo.markSynced(DEV_VISIT_UUID, db);
      visitAttributeRepo.markSynced(DEV_VISIT_UUID, db);

      save('150');

      expect(visitRepo.findDirty(db).map((v) => v.uuid)).toContain(DEV_VISIT_UUID);
      const readStatus = visitAttributeRepo
        .listByVisit(DEV_VISIT_UUID, db)
        .find((row) => row.visit_attribute_type_uuid === VISIT_READ_STATUS);
      expect(readStatus).toMatchObject({ value: '$', sync: SYNC_DIRTY });
    });

    it('edits by writing only what changed; the newest value wins', () => {
      save('165');
      expect(save('150')).toEqual({ inserted: 1, voided: 0 });
      expect(save('150')).toEqual({ inserted: 0, voided: 0 });
      expect(visitAttributeRepo.findValue(DEV_VISIT_UUID, VISIT_RISK, db)).toBe('1.0');
    });
  });

  describe('captureSos', () => {
    it('numbers a second SOS in the same stage and hour', () => {
      const result = captureSos(DEV_VISIT_UUID, WRITER, NOW, db);
      expect(result.kind).toBe('created');
      if (result.kind !== 'created') return;
      expect(obsRepo.getSosStageHourValue(result.encounterUuid, db)).toBe('Stage1_Hour2_SOS2');
    });

    it('is blocked during Decision Pending and for another provider', () => {
      expect(captureSos(DEV_VISIT_UUID, { ...WRITER, providerUuid: 'someone-else' }, NOW, db)).toEqual({
        kind: 'blocked',
        reason: 'notVisitHolder',
      });
      visitAttributeRepo.upsertLocal(DEV_VISIT_UUID, DECISION_PENDING, 'true', db);
      expect(captureSos(DEV_VISIT_UUID, WRITER, NOW, db)).toEqual({ kind: 'blocked', reason: 'decisionPending' });
    });
  });

  describe('endStage1', () => {
    it('Move to Stage 2 writes Stage 2 first card with its marker and clears Decision Pending', () => {
      visitAttributeRepo.upsertLocal(DEV_VISIT_UUID, DECISION_PENDING, 'true', db);
      expect(endStage1(DEV_VISIT_UUID, STAGE1_OUTCOME.MOVE_TO_STAGE2, {}, WRITER, NOW, db).kind).toBe('startStage2');

      const latest = encounterRepo.findLatestClinicalByVisit(DEV_VISIT_UUID, db)!;
      expect(encounterTypeName(latest.encounter_type_uuid!)).toBe('Stage2_Hour1_1');
      expect(obsRepo.getEncounterTypeValue(latest.uuid, db)).toBe('NORMAL');
      expect(visitAttributeRepo.findValue(DEV_VISIT_UUID, DECISION_PENDING, db)).toBe('false');
    });

    it('a referral completes the visit: REFER_TYPE in English, end date set, no longer active', () => {
      endStage1(DEV_VISIT_UUID, STAGE1_OUTCOME.REFER_TO_ICU, {}, WRITER, NOW, db);

      const complete = encounterRepo.findVisitCompleteUuid(DEV_VISIT_UUID, db)!;
      expect(obsRepo.listByEncounter(complete, db).find((row) => row.conceptuuid === REFER_TYPE)?.value).toBe(
        'Refer to high dependency unit / ICU',
      );
      expect(visitRepo.findActiveVisitsByProvider(WRITER.providerUuid, db)).toEqual([]);
      expect(visitRepo.findDirty(db)[0]).toMatchObject({ uuid: DEV_VISIT_UUID, sync: SYNC_DIRTY });
    });

    it('a mother death needs a reason before anything is written', () => {
      expect(endStage1(DEV_VISIT_UUID, STAGE1_OUTCOME.MOTHER_DEATH, {}, WRITER, NOW, db)).toEqual({ kind: 'reasonRequired' });
      expect(encounterRepo.findVisitCompleteUuid(DEV_VISIT_UUID, db)).toBeNull();
      expect(VOIDED_YES).toBe(1);
    });
  });
});
