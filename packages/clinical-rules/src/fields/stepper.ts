import { ALERT_THRESHOLDS } from '../ranges/alertThresholds';
import { INFUSION_INPUT_LIMITS, INPUT_LIMITS } from '../ranges/inputLimits';
import { getRangeFor } from '../ranges/rangeProfiles';
import { STEPPER_STEPS } from '../ranges/stepperSteps';
import type { AlertThreshold, InputLimits, RangeProfileId, StepperId } from '../ranges/types';

/** A stepper's bounds, first value and step. Every number comes from Android data or `STEPPER_STEPS`. */
export interface StepperSpec {
  readonly min: number;
  readonly max: number;
  readonly base: number; // what the first + fills an empty field with
  readonly step: number;
  readonly fractionDigits: number; // decimals a value keeps (typing limit)
}

const LIMITS: Readonly<Partial<Record<StepperId, InputLimits>>> = { ...INPUT_LIMITS, ...INFUSION_INPUT_LIMITS };
const THRESHOLDS: Readonly<Partial<Record<StepperId, AlertThreshold>>> = ALERT_THRESHOLDS;

// Android has no range for some inputs; the keystroke limit is then the only bound.
function boundsFromLimits(limits: InputLimits | undefined): { min: number; max: number } {
  if (limits?.kind === 'integer') return { min: 0, max: 10 ** limits.maxDigits - 1 };
  if (limits?.kind === 'decimal') {
    return { min: 0, max: 10 ** limits.maxIntegerDigits - 10 ** -limits.maxFractionDigits };
  }
  return { min: 0, max: 0 };
}

/**
 * Min and max are the client's validation range (else the input limit); the base is the lowest
 * valid value that is not an alert (decided 2026-10-23), e.g. FHR 110, Contractions 3.
 */
export function getStepperSpec(id: StepperId, profile: RangeProfileId): StepperSpec {
  const limits = LIMITS[id];
  const fractionDigits = limits?.kind === 'decimal' ? limits.maxFractionDigits : 0;
  const { min, max } = getRangeFor(profile, id) ?? boundsFromLimits(limits);
  const step = STEPPER_STEPS[id];
  const threshold = THRESHOLDS[id];

  let base = min;
  if (threshold?.below !== undefined) base = Math.max(base, threshold.below);
  if (threshold?.atOrBelow !== undefined) base = Math.max(base, threshold.atOrBelow + step);

  return { min, max, base: Number(Math.min(base, max).toFixed(fractionDigits)), step, fractionDigits };
}
