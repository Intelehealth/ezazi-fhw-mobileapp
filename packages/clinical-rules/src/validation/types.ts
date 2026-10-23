import type { FIELD_ID, FieldId, InfusionInputId } from '../constants';
import type { ValidationRange } from '../ranges/types';
import type { InfusionEntry } from '../storage/infusionJson';
import type { MedicineEntry } from '../storage/medicineText';

/** Why a value is rejected. The app shows `messageKey`, filled with the range's min and max. */
export type ValidationReason =
  | 'outOfRange'
  | 'notANumber'
  | 'notBelowSystolic'
  | 'enterSystolicFirst'
  | 'infusionIncomplete'
  | 'medicineMissing';

/** The nurse's Yes/No on Oxytocin, IV Fluids or Medicine. Null: not answered. */
export type YesNoAnswer = 'yes' | 'no' | null;

export interface InfusionAnswer {
  readonly answer: YesNoAnswer;
  readonly entry: InfusionEntry;
}

export interface MedicineAnswer {
  readonly answer: YesNoAnswer;
  readonly medicines: readonly MedicineEntry[];
}

/** What a card holds when the nurse taps Save: only the fields that card shows. */
export interface CardInput {
  readonly values: Readonly<Partial<Record<FieldId, string | null>>>; // as typed
  readonly [FIELD_ID.OXYTOCIN]?: InfusionAnswer;
  readonly [FIELD_ID.IV_FLUIDS]?: InfusionAnswer;
  readonly [FIELD_ID.MEDICINE]?: MedicineAnswer;
}

export interface ValidationError {
  readonly id: FieldId | InfusionInputId;
  readonly reason: ValidationReason;
  readonly range: ValidationRange | null;
  readonly messageKey: string;
}

/**
 * What to do with a value while it is typed. `pending`: an unfinished number such as "1.";
 * keep the text, store nothing yet. `warn`: keep it and show the message. `clear`: empty it.
 */
export type TypingCheck =
  | { readonly kind: 'accept' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'warn'; readonly error: ValidationError }
  | { readonly kind: 'clear'; readonly error: ValidationError };
