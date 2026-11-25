import { getAlertCode } from '../alerts/alertCode';
import { javaTrim } from '../internal/javaTrim';
import { ALERT_CODE, FIELD_ID, NO_RESPONSE_VALUE } from '../constants';
import type { AlertCode, ConceptKey, FieldId } from '../constants';
import { STAGE1_AND_2_FIELDS } from '../fields/stage1And2Fields';
import { encodeInfusion } from '../storage/infusionJson';
import { encodeMedicine } from '../storage/medicineText';
import type { CardInput, InfusionAnswer } from '../validation/types';

/** One obs to insert. The app resolves `conceptKey` to its uuid and adds encounter, creator and time. */
export interface ObsDraft {
  readonly fieldId: FieldId;
  readonly conceptKey: ConceptKey;
  readonly value: string;
  readonly comment: AlertCode | null; // null where Android leaves it unset
}

/** Assessment and Plan notes added on this card, each saved as its own obs. */
export interface CardNotes {
  readonly [FIELD_ID.ASSESSMENT]?: readonly string[];
  readonly [FIELD_ID.PLAN]?: readonly string[];
}

const EMPTY_JSON = encodeInfusion({});

function infusionValues(answer: InfusionAnswer | undefined): string[] {
  if (answer?.answer === 'no') return [NO_RESPONSE_VALUE];
  if (answer?.answer !== 'yes') return [];
  const json = encodeInfusion(answer.entry);
  return json === EMPTY_JSON ? [] : [json];
}

/**
 * The obs Android's `saveObs` writes for a new card, in field order: each filled value with
 * its alert code; "No" or the infusion JSON for Oxytocin and IV Fluids; "No" or one obs per
 * medicine; one obs per note. Empty values write nothing. Validate with `getCardErrors` first.
 */
export function buildNewCardObs(input: CardInput, notes: CardNotes = {}): ObsDraft[] {
  const drafts: ObsDraft[] = [];

  for (const field of STAGE1_AND_2_FIELDS) {
    const add = (value: string, comment: AlertCode | null) =>
      drafts.push({ fieldId: field.id, conceptKey: field.conceptKey, value, comment });

    if (field.storage === 'value') {
      // Android trims each typed value as it is entered (PartogramQueryListingAdapter), so the
      // stored value and its alert code both see the trimmed text.
      const value = javaTrim(input.values[field.id] ?? '');
      if (value !== '') add(value, getAlertCode(field.id, value));
    } else if (field.storage === 'infusion' && field.input.kind === 'infusion') {
      infusionValues(input[field.input.variant]).forEach((value) => add(value, null));
    } else if (field.storage === 'medicineList') {
      const medicine = input[FIELD_ID.MEDICINE];
      if (medicine?.answer === 'no') add(NO_RESPONSE_VALUE, null);
      // Android `Medicine.toObs` writes an empty comment on each medicine row.
      if (medicine?.answer === 'yes') medicine.medicines.forEach((entry) => add(encodeMedicine(entry), ALERT_CODE.NONE));
    } else if (field.storage === 'noteList') {
      const fieldNotes = field.id === FIELD_ID.ASSESSMENT ? notes[FIELD_ID.ASSESSMENT] : notes[FIELD_ID.PLAN];
      fieldNotes?.filter((note) => note !== '').forEach((note) => add(note, null));
    }
  }

  return drafts;
}
