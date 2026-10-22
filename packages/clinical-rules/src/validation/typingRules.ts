import { FIELD_ID, INFUSION_INPUT_ID } from '../constants';
import { parseDecimal, parseJavaInt } from '../internal/javaNumbers';
import { javaTrim } from '../internal/javaTrim';
import { getValidationRange } from '../ranges/rangeProfiles';
import type { RangeProfileId } from '../ranges/types';
import type { TypingCheck } from './types';
import { isFilled, isInRange, validationError } from './validationError';

/** Checks Android runs while a value is typed (`PartogramQueryListingAdapter`). */

const ACCEPT: TypingCheck = { kind: 'accept' };
const PENDING: TypingCheck = { kind: 'pending' };

/** Diastolic typed (adapter 880-901): needs systolic first, and must be below it. */
export function checkDiastolicTyping(systolic: string | null, diastolic: string | null): TypingCheck {
  const diastolicText = javaTrim(diastolic ?? '');
  if (diastolicText.length === 0) return ACCEPT;
  const systolicText = javaTrim(systolic ?? '');
  if (systolicText.length === 0) {
    return { kind: 'clear', error: validationError(FIELD_ID.DIASTOLIC_BP, 'enterSystolicFirst') };
  }
  const systolicValue = parseJavaInt(systolicText);
  const diastolicValue = parseJavaInt(diastolicText);
  if (systolicValue === null || diastolicValue === null || diastolicValue < systolicValue) return ACCEPT;
  return { kind: 'clear', error: validationError(FIELD_ID.DIASTOLIC_BP, 'notBelowSystolic') };
}

/** Systolic typed (adapter 857-878): a filled diastolic above it is cleared, silently. */
export function systolicClearsDiastolic(systolic: string | null, diastolic: string | null): boolean {
  const systolicValue = parseJavaInt(javaTrim(systolic ?? ''));
  const diastolicValue = parseJavaInt(javaTrim(diastolic ?? ''));
  return systolicValue !== null && diastolicValue !== null && systolicValue < diastolicValue;
}

/** Oxytocin strength typed (adapter 1236-1262): out of range is cleared. */
export function checkStrengthTyping(text: string | null, profile: RangeProfileId): TypingCheck {
  const value = javaTrim(text ?? '');
  if (value.length === 0) return ACCEPT;
  if (value.endsWith('.')) return PENDING;
  const strength = parseDecimal(value);
  if (strength === null) return PENDING;
  const range = getValidationRange(profile, INFUSION_INPUT_ID.STRENGTH);
  if (isInRange(strength, range)) return ACCEPT;
  return { kind: 'clear', error: validationError(INFUSION_INPUT_ID.STRENGTH, 'outOfRange', range) };
}

/** Infusion rate typed (adapter 997-1016): below min warns, above max is cleared. */
export function checkInfusionRateTyping(text: string | null, profile: RangeProfileId): TypingCheck {
  if (!isFilled(text)) return ACCEPT;
  const rate = parseJavaInt(text);
  if (rate === null) return PENDING;
  const range = getValidationRange(profile, INFUSION_INPUT_ID.INFUSION_RATE);
  if (isInRange(rate, range)) return ACCEPT;
  const error = validationError(INFUSION_INPUT_ID.INFUSION_RATE, 'outOfRange', range);
  return rate < range.min ? { kind: 'warn', error } : { kind: 'clear', error };
}

/** Infusion rate loses focus (adapter 986-995): still below min is cleared. */
export function checkInfusionRateOnBlur(text: string | null, profile: RangeProfileId): TypingCheck {
  const check = checkInfusionRateTyping(text, profile);
  return check.kind === 'warn' ? { kind: 'clear', error: check.error } : check;
}
