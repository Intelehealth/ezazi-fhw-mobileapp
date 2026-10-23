import { ALERT_CODE } from '../constants';
import type { AlertCode, FieldId } from '../constants';
import { getField } from '../fields/cardFields';
import { parseDecimal, parseJavaInt } from '../internal/javaNumbers';
import { ALERT_THRESHOLDS } from '../ranges/alertThresholds';
import type { AlertThreshold } from '../ranges/types';

const THRESHOLDS: Readonly<Partial<Record<FieldId, AlertThreshold>>> = ALERT_THRESHOLDS;

// Java `String.equalsIgnoreCase`, which Android uses for every option match.
const equalsIgnoreCase = (a: string, b: string) => a.length === b.length && a.toUpperCase() === b.toUpperCase();

function isRed(value: number, t: AlertThreshold): boolean {
  return (
    (t.below !== undefined && value < t.below) ||
    (t.atOrBelow !== undefined && value <= t.atOrBelow) ||
    (t.above !== undefined && value > t.above) ||
    (t.atOrAbove !== undefined && value >= t.atOrAbove)
  );
}

/**
 * The `obs.comment` code for one stored value, as Android's `getAlertNameUpdated`: `''` when empty,
 * `'R'` on an alert option or past a threshold, otherwise `'G'`. Unlike Android, a value that is not a
 * number is `'G'` instead of a crash (README deviations). Infusion, medicine and note rows are never coded.
 */
export function getAlertCode(fieldId: FieldId, value: string | null | undefined): AlertCode {
  if (value === null || value === undefined || value === '') return ALERT_CODE.NONE;

  const input = getField(fieldId)?.input;
  if (input?.kind === 'select') {
    const option = input.options.find((candidate) => equalsIgnoreCase(candidate.value, value));
    return option?.alert ? ALERT_CODE.RED : ALERT_CODE.GREEN;
  }

  const threshold = THRESHOLDS[fieldId];
  if (threshold && (input?.kind === 'integer' || input?.kind === 'decimal')) {
    const number = input.kind === 'integer' ? parseJavaInt(value) : parseDecimal(value);
    return number !== null && isRed(number, threshold) ? ALERT_CODE.RED : ALERT_CODE.GREEN;
  }

  return ALERT_CODE.GREEN;
}
