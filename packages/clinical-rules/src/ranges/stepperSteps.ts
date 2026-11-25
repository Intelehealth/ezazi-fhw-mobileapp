import { FIELD_ID, INFUSION_INPUT_ID } from '../constants';
import { deepFreeze } from '../internal/deepFreeze';
import type { StepperId } from './types';

/**
 * How far one - / + tap moves a stepper. Android had no steppers; these follow the Figma design
 * (decided 2026-10-23, Kaveri): 1 per tap, 0.1 for temperature, 5 for the infusion rate.
 */
export const STEPPER_STEPS: Readonly<Record<StepperId, number>> = deepFreeze({
  [FIELD_ID.BASELINE_FHR]: 1,
  [FIELD_ID.PULSE]: 1,
  [FIELD_ID.SYSTOLIC_BP]: 1,
  [FIELD_ID.DIASTOLIC_BP]: 1,
  [FIELD_ID.TEMPERATURE]: 0.1,
  [FIELD_ID.CONTRACTIONS_PER_10MIN]: 1,
  [FIELD_ID.CONTRACTION_DURATION]: 1,
  [INFUSION_INPUT_ID.STRENGTH]: 1,
  [INFUSION_INPUT_ID.INFUSION_RATE]: 5,
});
