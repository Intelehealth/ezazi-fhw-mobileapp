import { FIELD_ID, INFUSION_INPUT_ID } from '../constants';
import type { FieldId } from '../constants';
import { parseDecimal, parseJavaInt } from '../internal/javaNumbers';
import { javaTrim } from '../internal/javaTrim';
import { getValidationRanges } from '../ranges/rangeProfiles';
import type { RangeId, RangeProfileId, RangeTable } from '../ranges/types';
import type { InfusionEntry } from '../storage/infusionJson';
import type { CardInput, InfusionAnswer, ValidationError } from './types';
import { isFilled, isInRange, validationError } from './validationError';

/**
 * Save on a Stage 1/2 card (`PartogramDataCaptureActivity.saveObs`). Every field is optional;
 * a value is checked only when filled. Returns every error in Android's order; Android
 * shows only the first. Ranges come from the client's profile.
 */

type SaveCheck = (input: CardInput, ranges: RangeTable) => ValidationError | null;

function typedValue(input: CardInput, id: FieldId): string {
  return javaTrim(input.values[id] ?? '');
}

/** `ValidatePartogramFields.isValidParameter` / `isValidSystolicBP`. */
function rangeCheck(id: FieldId & RangeId, parse: (text: string) => number | null): SaveCheck {
  return (input, ranges) => {
    const text = typedValue(input, id);
    if (text.length === 0) return null;
    const value = parse(text);
    if (value === null) return validationError(id, 'notANumber', ranges[id]);
    return isInRange(value, ranges[id]) ? null : validationError(id, 'outOfRange', ranges[id]);
  };
}

/** `isValidDiastolicBP`: only when both are filled; in range and below systolic. */
const diastolicCheck: SaveCheck = (input, ranges) => {
  const range = ranges[FIELD_ID.DIASTOLIC_BP];
  const systolicText = typedValue(input, FIELD_ID.SYSTOLIC_BP);
  const diastolicText = typedValue(input, FIELD_ID.DIASTOLIC_BP);
  if (systolicText.length === 0 || diastolicText.length === 0) return null;

  const systolic = parseJavaInt(systolicText);
  const diastolic = parseJavaInt(diastolicText);
  if (diastolic === null) return validationError(FIELD_ID.DIASTOLIC_BP, 'notANumber', range);
  if (systolic === null) return null; // reported on systolic
  if (!isInRange(diastolic, range)) return validationError(FIELD_ID.DIASTOLIC_BP, 'outOfRange', range);
  return diastolic < systolic ? null : validationError(FIELD_ID.DIASTOLIC_BP, 'notBelowSystolic', range);
};

/** `Medication.isValidOxytocin` / `isValidIVFluid`: after Yes, all inputs and a rate in range. */
function infusionCheck(
  id: FieldId,
  pick: (input: CardInput) => InfusionAnswer | undefined,
  mainInput: keyof InfusionEntry,
): SaveCheck {
  return (input, ranges) => {
    const answer = pick(input);
    if (answer?.answer !== 'yes') return null;

    const { entry } = answer;
    const rateRange = ranges[INFUSION_INPUT_ID.INFUSION_RATE];
    const rate = isFilled(entry.infusionRate) ? parseJavaInt(entry.infusionRate) : null;
    const complete =
      isFilled(entry[mainInput]) && isFilled(entry.infusionStatus) && rate !== null && isInRange(rate, rateRange);
    return complete ? null : validationError(id, 'infusionIncomplete', rateRange);
  };
}

/** `ParamInfo.isValidMedicine`: after Yes, at least one medicine. */
const medicineCheck: SaveCheck = (input) => {
  const answer = input[FIELD_ID.MEDICINE];
  if (answer?.answer !== 'yes' || answer.medicines.length > 0) return null;
  return validationError(FIELD_ID.MEDICINE, 'medicineMissing');
};

// Android's order (`saveObs` 711-733). Contractions per 10 min has no Save check.
const SAVE_CHECKS: readonly SaveCheck[] = [
  infusionCheck(FIELD_ID.OXYTOCIN, (input) => input[FIELD_ID.OXYTOCIN], 'strength'),
  infusionCheck(FIELD_ID.IV_FLUIDS, (input) => input[FIELD_ID.IV_FLUIDS], 'type'),
  medicineCheck,
  rangeCheck(FIELD_ID.BASELINE_FHR, parseDecimal),
  rangeCheck(FIELD_ID.PULSE, parseDecimal),
  rangeCheck(FIELD_ID.SYSTOLIC_BP, parseJavaInt),
  diastolicCheck,
  rangeCheck(FIELD_ID.TEMPERATURE, parseDecimal),
  rangeCheck(FIELD_ID.CONTRACTION_DURATION, parseDecimal),
];

/** Every Save error on a card, in Android's order. Empty: the card may be saved. */
export function getCardErrors(input: CardInput, profile: RangeProfileId): readonly ValidationError[] {
  const ranges = getValidationRanges(profile);
  return SAVE_CHECKS.map((check) => check(input, ranges)).filter(
    (error): error is ValidationError => error !== null,
  );
}
