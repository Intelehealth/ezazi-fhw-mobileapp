import { getAlertCode } from '../alerts/alertCode';
import { javaTrim } from '../internal/javaTrim';
import { ALERT_CODE, FIELD_ID, NO_RESPONSE_VALUE } from '../constants';
import type { FieldId } from '../constants';
import { STAGE1_AND_2_FIELDS } from '../fields/stage1And2Fields';
import { encodeInfusion } from '../storage/infusionJson';
import { encodeMedicine } from '../storage/medicineText';
import { isNoResponse } from '../storage/noResponse';
import type { CardInput } from '../validation/types';
import type { CardNotes, ObsDraft } from './newCardObs';

/** One non-voided obs already on the card. `createdAt` is the stored UTC text; newer sorts later. */
// Pass rows newest first: rows with the same `createdAt` (same second) keep that order.
export interface StoredObs {
  readonly uuid: string;
  readonly fieldId: FieldId;
  readonly value: string;
  readonly createdAt: string;
}

/** An obs rewritten in place by uuid: Android's EDIT save keeps the row and overwrites its value. */
export interface ObsRewrite extends ObsDraft {
  readonly uuid: string;
  readonly createdAt?: string; // kept as stored (notes); absent: the save time, as Android
}

/** What an edited card's save writes: obs to insert, obs to rewrite in place, obs uuids to void. */
export interface CardEdit {
  readonly insert: readonly ObsDraft[];
  readonly update: readonly ObsRewrite[];
  readonly voidUuids: readonly string[];
}

const EMPTY_JSON = encodeInfusion({});

// Android `ObsDAO.getObsuuid`: the card's oldest live row for a concept is the one an edit rewrites.
// Stored UTC text sorts as time; the sort is stable, so same-second rows keep the caller's order.
const oldestFirst = (rows: readonly StoredObs[]) =>
  [...rows].sort((a, b) => (a.createdAt === b.createdAt ? 0 : a.createdAt < b.createdAt ? -1 : 1));

/**
 * Re-saving a card as Android's EDIT save (`PartogramDataCaptureActivity.saveObs` 642-745, decided
 * 2026-10-31 until the write-new question is settled): each shown field rewrites its existing row in
 * place, a field with no row gets a new one, and a stale "No" is voided. Medicines and notes as
 * Android's lists: saved ones are kept, new or edited ones are new rows, and a removed or edited
 * medicine's old row is not voided (LABOUR_OPEN_POINTS.md); only Medicine "No" voids them.
 */
export function buildEditedCardObs(stored: readonly StoredObs[], input: CardInput, notes: CardNotes = {}): CardEdit {
  const insert: ObsDraft[] = [];
  const update: ObsRewrite[] = [];
  const voidUuids: string[] = [];

  for (const field of STAGE1_AND_2_FIELDS) {
    const rows = stored.filter((row) => row.fieldId === field.id);
    const draft = (value: string, comment: ObsDraft['comment']): ObsDraft => ({
      fieldId: field.id,
      conceptKey: field.conceptKey,
      value,
      comment,
    });
    const write = (target: StoredObs | undefined, value: string, comment: ObsDraft['comment']) =>
      target ? update.push({ ...draft(value, comment), uuid: target.uuid }) : insert.push(draft(value, comment));
    const noRow = rows.find((row) => isNoResponse(row.value));
    const voidStaleNo = (written?: StoredObs) => {
      if (noRow && noRow !== written) voidUuids.push(noRow.uuid);
    };

    if (field.storage === 'value') {
      if (!(field.id in input.values)) continue;
      const value = javaTrim(input.values[field.id] ?? ''); // trimmed at input, as Android
      const target = oldestFirst(rows)[0];
      // Every shown field is rewritten, unchanged or not; a cleared choice writes nothing (Android radio flow).
      if (target ? value !== '' || field.input.kind !== 'select' : value !== '') {
        write(target, value, getAlertCode(field.id, value));
      }
    } else if (field.storage === 'infusion' && field.input.kind === 'infusion') {
      const answer = input[field.input.variant];
      if (answer?.answer === 'no') write(noRow, NO_RESPONSE_VALUE, null); // the earlier JSON stays, as Android
      if (answer?.answer === 'yes') {
        const json = encodeInfusion(answer.entry);
        const target = oldestFirst(rows)[0];
        const changed = json !== EMPTY_JSON && !rows.some((row) => row.value === json);
        if (changed) write(target, json, null);
        voidStaleNo(changed ? target : undefined);
      }
    } else if (field.storage === 'medicineList') {
      const medicine = input[FIELD_ID.MEDICINE];
      const savedMedicines = rows.filter((row) => !isNoResponse(row.value));
      if (medicine?.answer === 'no') {
        savedMedicines.forEach((row) => voidUuids.push(row.uuid));
        write(noRow, NO_RESPONSE_VALUE, null);
      }
      if (medicine?.answer === 'yes') {
        // Android `getMedicinesObsList` writes only medicines not loaded from the card: a saved one is
        // left as it is, a new or edited one is a new row (empty comment, as `Medicine.toObs`).
        const kept = new Set<string>();
        for (const value of medicine.medicines.map(encodeMedicine)) {
          const match = savedMedicines.find((row) => row.value === value && !kept.has(row.uuid));
          if (match) kept.add(match.uuid);
          else insert.push(draft(value, ALERT_CODE.NONE));
        }
        voidStaleNo();
      }
    } else if (field.storage === 'noteList') {
      // Android `getPlansObsList` / `getAssessmentsObsList`: saved notes are rewritten as they are, new ones added.
      rows.forEach((row) => update.push({ ...draft(row.value, null), uuid: row.uuid, createdAt: row.createdAt }));
      const added = field.id === FIELD_ID.ASSESSMENT ? notes[FIELD_ID.ASSESSMENT] : notes[FIELD_ID.PLAN];
      added?.filter((note) => note !== '').forEach((note) => insert.push(draft(note, null)));
    }
  }

  return { insert, update, voidUuids };
}
