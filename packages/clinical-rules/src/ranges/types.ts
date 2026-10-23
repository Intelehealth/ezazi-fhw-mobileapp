import type { FIELD_ID, INFUSION_INPUT_ID } from '../constants';

/** Every field or input that has a min/max range. */
export type RangeId =
  | typeof FIELD_ID.BASELINE_FHR
  | typeof FIELD_ID.PULSE
  | typeof FIELD_ID.SYSTOLIC_BP
  | typeof FIELD_ID.DIASTOLIC_BP
  | typeof FIELD_ID.TEMPERATURE
  | typeof FIELD_ID.CONTRACTION_DURATION
  | typeof INFUSION_INPUT_ID.STRENGTH
  | typeof INFUSION_INPUT_ID.INFUSION_RATE;

export type RangeUnit = 'bpm' | 'mmHg' | 'degF' | 'seconds' | 'iuPerL' | 'dropsPerMin';

/** When Android checks a range: on Save (blocks it), or while typing (clears the value). */
export type RangeCheckPoint = 'save' | 'typing' | 'saveAndTyping';

/** Inclusive bounds. Only `min` and `max` may differ per client (ARCHITECTURE_RULES §7a). */
export interface ValidationRange {
  readonly min: number;
  readonly max: number;
  readonly unit: RangeUnit;
  readonly checkedOn: RangeCheckPoint;
  readonly androidSource: string;
}

export type RangeTable = Readonly<Record<RangeId, ValidationRange>>;

/** What a client profile may change: min and/or max of any range, nothing else. */
export type RangeOverrides = Readonly<
  Partial<Record<RangeId, Readonly<Partial<Pick<ValidationRange, 'min' | 'max'>>>>>
>;

/** Range profiles, named after the clients they serve (`ClientConfig.id`). */
export type RangeProfileId = 'default' | 'nepal';

/** Keystroke limits (Android InputFilters). The same for every client. */
export type InputLimits =
  | { readonly kind: 'integer'; readonly maxDigits: 1 | 2 | 3 | 4 }
  | {
      readonly kind: 'decimal';
      readonly maxLength: number;
      readonly maxIntegerDigits: number;
      readonly maxFractionDigits: number;
    }
  | { readonly kind: 'text'; readonly maxLength: number };

export type IntegerLimits = Extract<InputLimits, { kind: 'integer' }>;
export type DecimalLimits = Extract<InputLimits, { kind: 'decimal' }>;
export type TextLimits = Extract<InputLimits, { kind: 'text' }>;

/** Every numeric field that can raise an alert. */
export type AlertThresholdId =
  | typeof FIELD_ID.BASELINE_FHR
  | typeof FIELD_ID.PULSE
  | typeof FIELD_ID.SYSTOLIC_BP
  | typeof FIELD_ID.DIASTOLIC_BP
  | typeof FIELD_ID.TEMPERATURE
  | typeof FIELD_ID.CONTRACTIONS_PER_10MIN
  | typeof FIELD_ID.CONTRACTION_DURATION;

/** Red when any set bound is crossed, using exactly the comparison Android writes. */
export interface AlertThreshold {
  readonly below?: number;
  readonly atOrBelow?: number;
  readonly above?: number;
  readonly atOrAbove?: number;
  readonly androidSource: string;
}

export type AlertThresholdTable = Readonly<Record<AlertThresholdId, AlertThreshold>>;
