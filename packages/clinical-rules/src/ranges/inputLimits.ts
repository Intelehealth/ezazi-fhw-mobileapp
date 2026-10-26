import { FIELD_ID, INFUSION_INPUT_ID } from '../constants';
import { deepFreeze } from '../internal/deepFreeze';
import type { InputLimits } from './types';

/**
 * THE keystroke limits of every typed input, as Android's InputFilters set them. Same for
 * every client. Fields: `PartogramQueryListingAdapter` 307-347.
 */
export const INPUT_LIMITS = deepFreeze({
  [FIELD_ID.BASELINE_FHR]: { kind: 'integer', maxDigits: 3 },
  [FIELD_ID.PULSE]: { kind: 'integer', maxDigits: 3 },
  [FIELD_ID.SYSTOLIC_BP]: { kind: 'integer', maxDigits: 3 },
  [FIELD_ID.DIASTOLIC_BP]: { kind: 'integer', maxDigits: 3 },
  [FIELD_ID.TEMPERATURE]: { kind: 'decimal', maxLength: 5, maxIntegerDigits: 3, maxFractionDigits: 1 },
  [FIELD_ID.CONTRACTIONS_PER_10MIN]: { kind: 'integer', maxDigits: 1 },
  [FIELD_ID.CONTRACTION_DURATION]: { kind: 'integer', maxDigits: 3 },
} as const satisfies Record<string, InputLimits>);

/** The inputs inside Oxytocin and IV Fluids (adapter 756-757, 980-981, 1216-1220). */
export const INFUSION_INPUT_LIMITS = deepFreeze({
  [INFUSION_INPUT_ID.STRENGTH]: { kind: 'decimal', maxLength: 5, maxIntegerDigits: 2, maxFractionDigits: 2 },
  [INFUSION_INPUT_ID.INFUSION_RATE]: { kind: 'integer', maxDigits: 2 },
  [INFUSION_INPUT_ID.OTHER_TYPE]: { kind: 'text', maxLength: 20 },
} as const satisfies Record<string, InputLimits>);

export type LimitedInputId = keyof typeof INPUT_LIMITS;
export type LimitedInfusionInputId = keyof typeof INFUSION_INPUT_LIMITS;
