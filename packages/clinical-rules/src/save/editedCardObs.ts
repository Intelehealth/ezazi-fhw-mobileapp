import { getAlertCode } from '../alerts/alertCode';
import { FIELD_ID, NO_RESPONSE_VALUE } from '../constants';
import type { FieldId } from '../constants';
import { STAGE1_AND_2_FIELDS } from '../fields/stage1And2Fields';
import { encodeInfusion } from '../storage/infusionJson';
import { encodeMedicine } from '../storage/medicineText';
import { isNoResponse } from '../storage/noResponse';
import type { CardInput } from '../validation/types';
import type { CardNotes, ObsDraft } from './newCardObs';

/** One non-voided obs already on the card. `createdAt` is the stored UTC text; newer sorts later. */
export interface StoredObs {
  readonly uuid: string;
  readonly fieldId: FieldId;
  readonly value: string;
  readonly createdAt: string;
}

/** What an edited card's save writes: new obs to insert, and obs uuids to void. */
export interface CardEdit {
  readonly insert: readonly ObsDraft[];
  readonly voidUuids: readonly string[];
}

const EMPTY_JSON = encodeInfusion({});

// Stored UTC text sorts as time; plain comparison keeps it locale-free.
const newestFirst = (rows: readonly StoredObs[]) =>
  [...rows].sort((a, b) => (a.createdAt === b.createdAt ? 0 : a.createdAt < b.createdAt ? 1 : -1));

/**
 * Re-saving a card, write-new (DB_CONVENTIONS; decided 2026-10-23): reads take the newest obs
 * per field, so a change is a new obs and nothing is overwritten. Same outcome as Android's
 * EDIT save: changed values (a cleared one saved empty), "No" ↔ Yes with the stale "No" voided,
 * no duplicate infusion, removed medicines voided, notes added only. Unchanged values write nothing.
 */
export function buildEditedCardObs(stored: readonly StoredObs[], input: CardInput, notes: CardNotes = {}): CardEdit {
  const insert: ObsDraft[] = [];
  const voidUuids: string[] = [];

  for (const field of STAGE1_AND_2_FIELDS) {
    const rows = newestFirst(stored.filter((row) => row.fieldId === field.id));
    const add = (value: string, comment: ObsDraft['comment']) =>
      insert.push({ fieldId: field.id, conceptKey: field.conceptKey, value, comment });
    const voidNo = () => rows.filter((row) => isNoResponse(row.value)).forEach((row) => voidUuids.push(row.uuid));

    if (field.storage === 'value') {
      if (!(field.id in input.values)) continue;
      const value = input.values[field.id] ?? '';
      const latest = rows[0];
      if (latest ? latest.value !== value : value !== '') add(value, getAlertCode(field.id, value));
    } else if (field.storage === 'infusion' && field.input.kind === 'infusion') {
      const answer = input[field.input.variant];
      if (answer?.answer === 'no' && !(rows[0] && isNoResponse(rows[0].value))) add(NO_RESPONSE_VALUE, null);
      if (answer?.answer === 'yes') {
        const json = encodeInfusion(answer.entry);
        if (json !== EMPTY_JSON && !rows.some((row) => row.value === json)) add(json, null);
        voidNo();
      }
    } else if (field.storage === 'medicineList') {
      const medicine = input[FIELD_ID.MEDICINE];
      const savedMedicines = rows.filter((row) => !isNoResponse(row.value));
      if (medicine?.answer === 'no') {
        savedMedicines.forEach((row) => voidUuids.push(row.uuid));
        if (!rows.some((row) => isNoResponse(row.value))) add(NO_RESPONSE_VALUE, null);
      }
      if (medicine?.answer === 'yes') {
        const kept = new Set<string>();
        for (const value of medicine.medicines.map(encodeMedicine)) {
          const match = savedMedicines.find((row) => row.value === value && !kept.has(row.uuid));
          if (match) kept.add(match.uuid);
          else add(value, null);
        }
        savedMedicines.filter((row) => !kept.has(row.uuid)).forEach((row) => voidUuids.push(row.uuid));
        voidNo();
      }
    } else if (field.storage === 'noteList') {
      const added = field.id === FIELD_ID.ASSESSMENT ? notes[FIELD_ID.ASSESSMENT] : notes[FIELD_ID.PLAN];
      added?.filter((note) => note !== '').forEach((note) => add(note, null));
    }
  }

  return { insert, voidUuids };
}
