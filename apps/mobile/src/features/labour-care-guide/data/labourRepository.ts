import {
  DECISION_PENDING_SET,
  FIELD_CONCEPT_KEY,
  FIELD_ID,
  RISK_FIELD_IDS,
  isNoResponse,
  buildEditedCardObs,
  buildNewCardObs,
  computeVisitRisk,
  DECISION_PENDING_CLEARED,
  decideEndStage1,
  decideEndStage2,
  decideSos,
  encodeMedicine,
  formatVisitRisk,
  parseUtcTimestamp,
} from '@ezazi/clinical-rules';
import type {
  CardInput,
  CardNotes,
  ConceptKey,
  EndStage1Decision,
  EndStage2Decision,
  EndStage2Details,
  FieldId,
  ObsDraft,
  OutcomeConceptKey,
  OutcomeDetails,
  SosBlockReason,
  Stage1OutcomeId,
  Stage2OutcomeId,
  Stage2OutcomeObs,
  StoredObs,
} from '@ezazi/clinical-rules';

import { writeCard } from '@/core/db/card';
import { encounterTypeName } from '@/core/db/constants/encounter';
import * as obsConcepts from '@/core/db/constants/obs';
import { DECISION_PENDING, VISIT_RISK } from '@/core/db/constants/visit';
import { encounterRepo, obsRepo, visitAttributeRepo, visitRepo } from '@/core/db/repositories';
import { SYNC_DIRTY, VOIDED_NO } from '@/core/db/syncFlags';
import { transact, type DbHandle } from '@/core/db/tx';
import { newUuid } from '@/core/db/uuid';
import type { WriterIdentity } from '@/core/session/writerIdentity';
import { localIsoTimestamp, utcIsoTimestamp } from '@/core/utils/datetime';

const CONCEPTS = obsConcepts as unknown as Readonly<
  Record<ConceptKey | OutcomeConceptKey | Stage2OutcomeObs['conceptKey'], string>
>;

const FIELD_BY_CONCEPT = new Map<string, FieldId>(
  (Object.entries(FIELD_CONCEPT_KEY) as [FieldId, ConceptKey][]).map(([fieldId, key]) => [CONCEPTS[key], fieldId]),
);

const obsRow = (
  encounterUuid: string,
  conceptKey: ConceptKey | OutcomeConceptKey | Stage2OutcomeObs['conceptKey'],
  value: string,
  comment: string | null,
  writer: WriterIdentity,
) => ({
  encounteruuid: encounterUuid,
  conceptuuid: CONCEPTS[conceptKey],
  value,
  comment,
  creator: writer.creatorUuid,
  creatoruuid: writer.creatorUuid,
  voided: VOIDED_NO,
});

/** Recomputes VISIT_RISK as Android does after every save; marks the visit for sync when it changed. */
export function refreshVisitRisk(visitUuid: string, now: number, on: DbHandle): string {
  const latest = obsRepo
    .getLatestObsByVisitAndConcepts(visitUuid, RISK_FIELD_IDS.map((id) => CONCEPTS[FIELD_CONCEPT_KEY[id]]), on)
    .flatMap((row) => {
      const fieldId = row.conceptuuid ? FIELD_BY_CONCEPT.get(row.conceptuuid) : undefined;
      return fieldId ? [{ fieldId, comment: row.comment }] : [];
    });
  const cervix = obsRepo.listCervixReadingsByVisit(visitUuid, on).flatMap((row) => {
    const at = parseUtcTimestamp(row.encounterTime);
    return at === null ? [] : [{ value: row.value, at }];
  });

  const text = formatVisitRisk(computeVisitRisk(latest, cervix, encounterRepo.isStage3Started(visitUuid, on), now));
  if (visitAttributeRepo.upsertLocal(visitUuid, VISIT_RISK, text, on) !== null) visitRepo.markDirty(visitUuid, on);
  return text;
}

// Android sets `obs.creator` only on the Oxytocin / IV JSON and on notes (PartogramDataCaptureActivity
// 1211, ObsDTO.toObs); value, "No" and medicine rows leave it NULL. `creatoruuid` is always set.
const CREATOR_CONCEPTS = new Set<ConceptKey>([
  FIELD_CONCEPT_KEY[FIELD_ID.OXYTOCIN],
  FIELD_CONCEPT_KEY[FIELD_ID.IV_FLUIDS],
  FIELD_CONCEPT_KEY[FIELD_ID.ASSESSMENT],
  FIELD_CONCEPT_KEY[FIELD_ID.PLAN],
]);
const hasAndroidCreator = (draft: ObsDraft) =>
  CREATOR_CONCEPTS.has(draft.conceptKey as ConceptKey) && !isNoResponse(draft.value);

/**
 * Each medicine and note is saved with the time it was added (Android). Matched to its row by
 * value, since an edited card writes only its new or changed medicines and notes.
 */
function addedAtLookup(input: SaveCardInput): (draft: ObsDraft) => string | undefined {
  const pending: { concept: string; value: string; at: string }[] = [];
  const add = (id: keyof NonNullable<SaveCardInput['addedAt']>, values: readonly string[]) =>
    values.forEach((value, index) => {
      const at = input.addedAt?.[id]?.[index];
      if (at) pending.push({ concept: FIELD_CONCEPT_KEY[id], value: value.trim(), at });
    });
  add(FIELD_ID.MEDICINE, (input.card[FIELD_ID.MEDICINE]?.medicines ?? []).map(encodeMedicine));
  add(FIELD_ID.ASSESSMENT, input.notes?.[FIELD_ID.ASSESSMENT] ?? []);
  add(FIELD_ID.PLAN, input.notes?.[FIELD_ID.PLAN] ?? []);
  return (draft) => {
    const index = pending.findIndex((entry) => entry.concept === draft.conceptKey && entry.value === draft.value.trim());
    return index < 0 ? undefined : pending.splice(index, 1)[0].at;
  };
}

/** A card's saved obs that belong to a field, newest first, voided ones left out: what Save and Show read. */
export function readStoredCardObs(encounterUuid: string, on: DbHandle): StoredObs[] {
  return obsRepo.listByEncounterNewestFirst(encounterUuid, on).flatMap((row) => {
    const fieldId = row.conceptuuid ? FIELD_BY_CONCEPT.get(row.conceptuuid) : undefined;
    return fieldId && row.voided === VOIDED_NO
      ? [{ uuid: row.uuid, fieldId, value: row.value ?? '', createdAt: row.created_date ?? '' }]
      : [];
  });
}

export interface SaveCardInput {
  visitUuid: string;
  encounterUuid: string;
  card: CardInput;
  notes?: CardNotes;
  /** When each medicine and note was added, in list order; its row takes it as `created_date`. */
  addedAt?: Partial<Record<typeof FIELD_ID.MEDICINE | keyof CardNotes, readonly string[]>>;
  writer: WriterIdentity;
  now: number;
}

/**
 * Saves one card in one transaction (Android `saveObs`): new obs from the package's builders, an
 * edited card's rows rewritten in place as Android, stale rows voided, the card marked for sync, VISIT_RISK refreshed,
 * then, as Android does on every save, the visit marked for sync and marked read.
 */
export function saveCard(input: SaveCardInput, on: DbHandle): { inserted: number; updated: number; voided: number } {
  return transact((tx) => {
    const stored = readStoredCardObs(input.encounterUuid, tx);

    const { insert, update, voidUuids } =
      stored.length > 0
        ? buildEditedCardObs(stored, input.card, input.notes)
        : { insert: buildNewCardObs(input.card, input.notes), update: [], voidUuids: [] };

    const addedAt = addedAtLookup(input);
    obsRepo.insertMany(
      insert.map((draft: ObsDraft) => ({
        ...obsRow(input.encounterUuid, draft.conceptKey, draft.value, draft.comment, input.writer),
        creator: hasAndroidCreator(draft) ? input.writer.creatorUuid : null,
        created_date: isNoResponse(draft.value) ? undefined : addedAt(draft),
      })),
      tx,
    );
    const now = utcIsoTimestamp(input.now);
    for (const draft of update) {
      obsRepo.rewriteCardObs(
        draft.uuid,
        {
          value: draft.value,
          comment: draft.comment,
          creator: hasAndroidCreator(draft) ? input.writer.creatorUuid : null,
          creatoruuid: input.writer.creatorUuid,
          created_date: draft.createdAt ?? (isNoResponse(draft.value) ? undefined : addedAt(draft)) ?? now,
        },
        tx,
      );
    }
    // The card was marked missed while its capture screen was open (the next card fell due): the saved data
    // wins, as on Android, which decides "missed" only when it draws the timeline (Kaveri, 2026-11-06, audit M2).
    const missedMarkers =
      insert.length + update.length > 0
        ? obsRepo.listObsUuidsByEncounterAndConcept(input.encounterUuid, obsConcepts.MISSED_ENCOUNTER, tx)
        : [];
    const toVoid = [...voidUuids, ...missedMarkers];
    if (toVoid.length > 0) obsRepo.markVoided(toVoid, tx);
    encounterRepo.markDirty(input.encounterUuid, tx);
    refreshVisitRisk(input.visitUuid, input.now, tx);
    visitRepo.markDirty(input.visitUuid, tx);
    visitAttributeRepo.markRead(input.visitUuid, tx);
    return { inserted: insert.length, updated: update.length, voided: toVoid.length };
  }, on);
}

export type SosResult = { kind: 'created'; encounterUuid: string } | { kind: 'blocked'; reason: SosBlockReason };

/** Creates an SOS card (`decideSos`): the LCG_SOS encounter and its SOS_STAGE_HOUR label, together. */
export function captureSos(visitUuid: string, writer: WriterIdentity, now: number, on: DbHandle): SosResult {
  return transact((tx) => {
    const latest = encounterRepo.findLatestClinicalByVisit(visitUuid, tx);
    const latestName = latest?.encounter_type_uuid ? encounterTypeName(latest.encounter_type_uuid) : null;
    const latestSos = encounterRepo.findLatestSosByVisit(visitUuid, tx);

    const decision = decideSos(
      {
        visitCompleted: encounterRepo.findVisitCompleteUuid(visitUuid, tx) !== null,
        isVisitHolder: visitRepo.hasProviderAccess(visitUuid, writer.providerUuid, tx),
        decisionPending: visitAttributeRepo.findValue(visitUuid, DECISION_PENDING, tx) === DECISION_PENDING_SET,
        latestCard:
          latest && latestName
            ? { name: latestName, providerUuid: latest.provider_uuid, privacyNoticeValue: latest.privacynotice_value }
            : null,
        latestSosLabel: latestSos ? obsRepo.getSosStageHourValue(latestSos.uuid, tx) : null,
      },
      now,
    );
    if (decision.kind === 'blocked') return decision;

    const encounterUuid = newUuid();
    encounterRepo.insertSos(
      {
        uuid: encounterUuid,
        visituuid: visitUuid,
        encounter_time: decision.encounterTime,
        provider_uuid: decision.providerUuid,
        privacynotice_value: decision.privacyNoticeValue,
        voided: VOIDED_NO,
        sync: SYNC_DIRTY,
      },
      tx,
    );
    obsRepo.insert(
      {
        encounteruuid: encounterUuid,
        conceptuuid: obsConcepts.SOS_STAGE_HOUR,
        value: decision.label,
        comment: null,
        creator: writer.creatorUuid,
        creatoruuid: writer.creatorUuid,
        voided: VOIDED_NO,
      },
      tx,
    );
    return { kind: 'created', encounterUuid };
  }, on);
}

/** Decision Pending "false" on a stage change or a completion, as Android; the visit then needs a sync. */
function clearDecisionPending(visitUuid: string, on: DbHandle): void {
  if (visitAttributeRepo.upsertLocal(visitUuid, DECISION_PENDING, DECISION_PENDING_CLEARED, on) !== null) {
    visitRepo.markDirty(visitUuid, on);
  }
}

/**
 * Completes a visit (Android `VisitCompletionHelper.insertVisitCompleteEncounter` + the outcome obs), shared by
 * End Stage 1 and 2, in the caller's transaction: a new VISIT_COMPLETE encounter and its obs under that same
 * uuid, the visit's end date, marked read, Decision Pending "false". False when the visit is already complete:
 * nothing is written (Android can write a second one; and the obs must never be orphaned by the encounter
 * dedupe, which would keep the old uuid; Kaveri, 2026-11-06).
 */
function completeVisit(
  visitUuid: string,
  completion: { visitCompleteTime: string; obs: readonly Stage2OutcomeObs[] },
  writer: WriterIdentity,
  now: number,
  tx: DbHandle,
): boolean {
  if (encounterRepo.findVisitCompleteUuid(visitUuid, tx)) return false;
  const uuid = newUuid();
  encounterRepo.insertVisitComplete(
    { uuid, visitUuid, providerUuid: writer.providerUuid, encounterTime: completion.visitCompleteTime },
    tx,
  );
  obsRepo.insertMany(completion.obs.map((o) => obsRow(uuid, o.conceptKey, o.value, null, writer)), tx);
  visitRepo.closeVisit(visitUuid, localIsoTimestamp(now), tx);
  visitAttributeRepo.markRead(visitUuid, tx);
  clearDecisionPending(visitUuid, tx);
  return true;
}

export type EndStageResult<D> = D | { kind: 'alreadyCompleted' };

/** Writes one End Stage 1 choice (`decideEndStage1`): Stage 2's first card, or the visit's completion. */
export function endStage1(
  visitUuid: string,
  outcome: Stage1OutcomeId,
  details: OutcomeDetails,
  writer: WriterIdentity,
  now: number,
  on: DbHandle,
): EndStageResult<EndStage1Decision> {
  const decision = decideEndStage1(outcome, details, now);
  if (decision.kind === 'reasonRequired') return decision;

  return transact((tx): EndStageResult<EndStage1Decision> => {
    if (decision.kind === 'startStage2') {
      const { start } = decision;
      writeCard(
        {
          visitUuid,
          cardName: start.card.name,
          encounterTime: start.encounterTime,
          privacyNoticeValue: start.privacyNoticeValue,
          marker: start.marker,
        },
        writer,
        tx,
      );
      if (visitAttributeRepo.upsertLocal(visitUuid, DECISION_PENDING, start.decisionPending, tx) !== null) {
        visitRepo.markDirty(visitUuid, tx);
      }
      return decision;
    }
    return completeVisit(visitUuid, decision, writer, now, tx) ? decision : { kind: 'alreadyCompleted' };
  }, on);
}

/**
 * Writes one End Stage 2 choice (`decideEndStage2`): a referral, Mother Death or "Other" completes the visit as
 * End Stage 1. "Stage-3 & Early Postpartum" writes nothing here: the delivery form does (not built yet).
 */
export function endStage2(
  visitUuid: string,
  outcome: Stage2OutcomeId,
  details: EndStage2Details,
  writer: WriterIdentity,
  now: number,
  on: DbHandle,
): EndStageResult<EndStage2Decision> {
  const decision = decideEndStage2(outcome, details, now);
  if (decision.kind !== 'completeVisit') return decision;
  return transact(
    (tx): EndStageResult<EndStage2Decision> =>
      completeVisit(visitUuid, decision, writer, now, tx) ? decision : { kind: 'alreadyCompleted' },
    on,
  );
}
