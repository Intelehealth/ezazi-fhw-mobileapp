import { validationMessageKey } from '../constants';
import type { FieldId, InfusionInputId } from '../constants';
import type { ValidationRange } from '../ranges/types';
import type { ValidationError, ValidationReason } from './types';

export function validationError(
  id: FieldId | InfusionInputId,
  reason: ValidationReason,
  range: ValidationRange | null = null,
): ValidationError {
  return { id, reason, range, messageKey: validationMessageKey(id, reason) };
}

export function isInRange(value: number, range: ValidationRange): boolean {
  return value >= range.min && value <= range.max;
}

// Java `s != null && s.length() > 0`: no trim.
export function isFilled(text: string | null | undefined): text is string {
  return text !== null && text !== undefined && text.length > 0;
}
