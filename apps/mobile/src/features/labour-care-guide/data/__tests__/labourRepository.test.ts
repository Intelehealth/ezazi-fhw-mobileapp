import { FIELD_ID, STAGE1_OUTCOME, STAGE2_OUTCOME } from '@ezazi/clinical-rules';

import { encounterTypeName } from '@/core/db/constants/encounter';
import { BASELINE_FHR, END_2ND_STAGE_OTHER, MISSED_ENCOUNTER, MOTHER_DECEASED, MOTHER_DECEASED_FLAG, REFER_TYPE } from '@/core/db/constants/obs';
import { DECISION_PENDING, VISIT_READ_STATUS, VISIT_RISK } from '@/core/db/constants/visit';
import { encounterRepo, obsRepo, providerRepo, visitAttributeRepo, visitRepo } from '@/core/db/repositories';
import { seedDevPatient } from '@/core/db/seeds/devPatient';
import { DEV_VISIT_UUID } from '@/core/db/seeds/devPatient.data';
import { SYNC_DIRTY, VOIDED_YES } from '@/core/db/syncFlags';
import { transact, type DbHandle } from '@/core/db/tx';
import { createTestDb, type TestDb } from '@/core/db/__tests__/helpers/testDb';

import { captureSos, endStage1, endStage2, readStoredCardObs, saveCard } from '../labourRepository';

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
    it('stamps each medicine and note with the time it was added, as Android', () => {
      const medicine = { form: 'Tablet', name: 'Paracetamol', strength: '650 mg', dosage: '1', dosageUnit: 'Tab', frequency: '', route: 'Oral', duration: '', durationUnit: '' };
      saveCard(
        {
          visitUuid: DEV_VISIT_UUID,
          encounterUuid: dueCard,
          card: { values: {}, [FIELD_ID.MEDICINE]: { answer: 'yes', medicines: [medicine] } },
          notes: { [FIELD_ID.PLAN]: ['Review', 'Recheck'] },
          addedAt: { [FIELD_ID.MEDICINE]: ['2026-10-29 08:01:00'], [FIELD_ID.PLAN]: ['2026-10-29 08:02:00', '2026-10-29 08:03:00'] },
          writer: WRITER,
          now: NOW,
        },
        db,
      );

      const createdAt = (value: string) => obsRepo.listByEncounter(dueCard, db).find((row) => row.value?.includes(value))?.created_date;
      expect(createdAt('Paracetamol')).toBe('2026-10-29 08:01:00');
      expect(createdAt('Review')).toBe('2026-10-29 08:02:00');
      expect(createdAt('Recheck')).toBe('2026-10-29 08:03:00');
    });

    it('on an edit, writes only the new medicine, with its own added time', () => {
      const first = { form: 'Tablet', name: 'Paracetamol', strength: '650 mg', dosage: '1', dosageUnit: 'Tab', frequency: '', route: 'Oral', duration: '', durationUnit: '' };
      const second = { ...first, name: 'Ibuprofen', strength: '400 mg' };
      const saveWith = (medicines: (typeof first)[], addedAt: string[]) =>
        saveCard(
          {
            visitUuid: DEV_VISIT_UUID,
            encounterUuid: dueCard,
            card: { values: {}, [FIELD_ID.MEDICINE]: { answer: 'yes', medicines } },
            addedAt: { [FIELD_ID.MEDICINE]: addedAt },
            writer: WRITER,
            now: NOW,
          },
          db,
        );

      saveWith([first], ['2026-10-29 08:01:00']);
      expect(readStoredCardObs(dueCard, db).filter((row) => row.fieldId === FIELD_ID.MEDICINE)).toHaveLength(1);

      expect(saveWith([first, second], ['2026-10-29 08:01:00', '2026-10-29 08:30:00'])).toMatchObject({ inserted: 1, voided: 0 });
      const createdAt = (value: string) => obsRepo.listByEncounter(dueCard, db).find((row) => row.value?.includes(value))?.created_date;
      expect(createdAt('Paracetamol')).toBe('2026-10-29 08:01:00');
      expect(createdAt('Ibuprofen')).toBe('2026-10-29 08:30:00');
    });

    it('sets creator only on the infusion JSON and notes, as Android; creatoruuid on every row', () => {
      saveCard(
        {
          visitUuid: DEV_VISIT_UUID,
          encounterUuid: dueCard,
          card: {
            values: { [FIELD_ID.BASELINE_FHR]: '140' },
            [FIELD_ID.OXYTOCIN]: { answer: 'yes', entry: { strength: '5', infusionRate: '20', infusionStatus: 'Started' } },
            [FIELD_ID.IV_FLUIDS]: NO,
          },
          notes: { [FIELD_ID.PLAN]: ['Review'] },
          writer: WRITER,
          now: NOW,
        },
        db,
      );

      const rows = obsRepo.listByEncounter(dueCard, db).filter((row) => row.value !== 'NORMAL');
      const creatorOf = (value: string) => rows.find((row) => row.value === value || row.value?.startsWith(value))?.creator;
      expect(creatorOf('140')).toBeNull();
      expect(creatorOf('No')).toBeNull();
      expect(creatorOf('{')).toBe('user-1');
      expect(creatorOf('Review')).toBe('user-1');
      expect(rows.every((row) => row.creatoruuid === 'user-1')).toBe(true);
    });

    it('writes the card with alert codes as the user, and marks it for sync', () => {
      expect(save('165')).toEqual({ inserted: 4, updated: 0, voided: 0 });

      const fhr = obsRepo.listByEncounter(dueCard, db).find((row) => row.conceptuuid === BASELINE_FHR)!;
      expect(fhr).toMatchObject({ value: '165', comment: 'R', creator: null, creatoruuid: 'user-1' });
      expect(obsRepo.hasRealObs(dueCard, db)).toBe(true);
      expect(encounterRepo.findUnsynced(db).map((row) => row.uuid)).toContain(dueCard);
    });

    it('a card marked missed while it was being filled: the saved data wins, the marker is voided (audit M2)', () => {
      // The next card fell due while the capture screen was open; the engine marked this one missed.
      obsRepo.insertMissedEncounterMarker({ encounterUuid: dueCard, creator: 'user-1', creatorUuid: 'user-1' }, db);
      expect(obsRepo.listObsUuidsByEncounterAndConcept(dueCard, MISSED_ENCOUNTER, db)).toHaveLength(1);

      expect(save('140')).toEqual({ inserted: 4, updated: 0, voided: 1 });

      expect(obsRepo.listObsUuidsByEncounterAndConcept(dueCard, MISSED_ENCOUNTER, db)).toHaveLength(0);
      const marker = obsRepo.listUnsyncedByEncounter(dueCard, db).find((row) => row.conceptuuid === MISSED_ENCOUNTER)!;
      expect(marker).toMatchObject({ voided: VOIDED_YES, sync: SYNC_DIRTY });
      expect(obsRepo.hasRealObs(dueCard, db)).toBe(true);
    });

    it('a save that writes nothing leaves a missed marker alone', () => {
      obsRepo.insertMissedEncounterMarker({ encounterUuid: dueCard, creator: 'user-1', creatorUuid: 'user-1' }, db);

      saveCard({ visitUuid: DEV_VISIT_UUID, encounterUuid: dueCard, card: { values: {} }, writer: WRITER, now: NOW }, db);

      expect(obsRepo.listObsUuidsByEncounterAndConcept(dueCard, MISSED_ENCOUNTER, db)).toHaveLength(1);
    });

    it("leaves a doctor's rows out of the edit read, so a nurse never rewrites them (Android getOBSByEncounterUUID)", () => {
      save('140');
      providerRepo.upsertMany([{ uuid: 'doc-provider', useruuid: 'doc-user', role: 'Organizational: Doctor' }], db);
      obsRepo.insertMany(
        [{ encounteruuid: dueCard, conceptuuid: BASELINE_FHR, value: '150', comment: null, creator: 'doc-user', creatoruuid: 'doc-user', voided: 0 }],
        db,
      );

      const stored = readStoredCardObs(dueCard, db).filter((row) => row.fieldId === FIELD_ID.BASELINE_FHR);
      expect(stored.map((row) => row.value)).toEqual(['140']);
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

    it('edits in place as Android: the same row takes the new value and its alert code', () => {
      save('165');
      const fhrRows = () => obsRepo.listByEncounter(dueCard, db).filter((row) => row.conceptuuid === BASELINE_FHR);
      const before = fhrRows()[0];

      // FHR and the three Medication "No" rows are rewritten; nothing new, nothing voided.
      expect(save('150')).toEqual({ inserted: 0, updated: 4, voided: 0 });
      expect(fhrRows()).toHaveLength(1);
      expect(fhrRows()[0]).toMatchObject({ uuid: before.uuid, value: '150', comment: 'G', voided: 0 });
      expect(encounterRepo.findUnsynced(db).map((row) => row.uuid)).toContain(dueCard);
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

    it('a completion clears Decision Pending, as Android on every path', () => {
      visitAttributeRepo.upsertLocal(DEV_VISIT_UUID, DECISION_PENDING, 'true', db);
      endStage1(DEV_VISIT_UUID, STAGE1_OUTCOME.SHIFT_TO_C_SECTION, {}, WRITER, NOW, db);
      expect(visitAttributeRepo.findValue(DEV_VISIT_UUID, DECISION_PENDING, db)).toBe('false');
    });

    it('a visit is completed once: a second completion writes nothing, and no outcome row is orphaned (audit M7)', () => {
      expect(endStage1(DEV_VISIT_UUID, STAGE1_OUTCOME.REFER_TO_ICU, {}, WRITER, NOW, db).kind).toBe('completeVisit');
      const complete = encounterRepo.findVisitCompleteUuid(DEV_VISIT_UUID, db)!;

      expect(endStage1(DEV_VISIT_UUID, STAGE1_OUTCOME.MOTHER_DEATH, { reason: 'PPH' }, WRITER, NOW, db)).toEqual({
        kind: 'alreadyCompleted',
      });

      const rows = obsRepo.listByEncounter(complete, db);
      expect(rows.map((row) => row.conceptuuid)).toEqual([REFER_TYPE]);
      expect(obsRepo.listObsByVisitAndConcept(DEV_VISIT_UUID, MOTHER_DECEASED, db)).toEqual([]);
    });

    it('a mother death needs a reason before anything is written', () => {
      expect(endStage1(DEV_VISIT_UUID, STAGE1_OUTCOME.MOTHER_DEATH, {}, WRITER, NOW, db)).toEqual({ kind: 'reasonRequired' });
      expect(encounterRepo.findVisitCompleteUuid(DEV_VISIT_UUID, db)).toBeNull();
      expect(VOIDED_YES).toBe(1);
    });
  });

  describe('endStage2', () => {
    it('Stage-3 & Early Postpartum writes nothing here (the delivery form does)', () => {
      expect(endStage2(DEV_VISIT_UUID, STAGE2_OUTCOME.STAGE3_EARLY_POSTPARTUM, {}, WRITER, NOW, db)).toEqual({
        kind: 'openDeliveryForm',
      });
      expect(encounterRepo.findVisitCompleteUuid(DEV_VISIT_UUID, db)).toBeNull();
    });

    it('Other completes the visit with REFER_TYPE "Other" and the comment', () => {
      endStage2(DEV_VISIT_UUID, STAGE2_OUTCOME.OTHER, { otherComment: 'Family took her home' }, WRITER, NOW, db);

      const complete = encounterRepo.findVisitCompleteUuid(DEV_VISIT_UUID, db)!;
      const rows = obsRepo.listByEncounter(complete, db);
      expect(rows.find((row) => row.conceptuuid === REFER_TYPE)?.value).toBe('Other');
      expect(rows.find((row) => row.conceptuuid === END_2ND_STAGE_OTHER)?.value).toBe('Family took her home');
      expect(visitRepo.findActiveVisitsByProvider(WRITER.providerUuid, db)).toEqual([]);
    });

    it('Mother Death writes the flag and the reason; without a reason nothing is written', () => {
      expect(endStage2(DEV_VISIT_UUID, STAGE2_OUTCOME.MOTHER_DEATH, {}, WRITER, NOW, db)).toEqual({ kind: 'reasonRequired' });
      expect(encounterRepo.findVisitCompleteUuid(DEV_VISIT_UUID, db)).toBeNull();

      endStage2(DEV_VISIT_UUID, STAGE2_OUTCOME.MOTHER_DEATH, { reason: 'PPH' }, WRITER, NOW, db);
      const rows = obsRepo.listByEncounter(encounterRepo.findVisitCompleteUuid(DEV_VISIT_UUID, db)!, db);
      expect(rows.find((row) => row.conceptuuid === MOTHER_DECEASED_FLAG)?.value).toBe('YES');
      expect(rows.find((row) => row.conceptuuid === MOTHER_DECEASED)?.value).toBe('PPH');
    });
  });
});

