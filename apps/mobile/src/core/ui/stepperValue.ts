/** A stepper's bounds, first value and step; the clinical rules package supplies them. */
export interface StepperBounds {
  min: number;
  max: number;
  base: number; // what - or + fills an empty field with
  step: number;
  fractionDigits: number;
}

const formatStepped = (value: number, fractionDigits: number): string => String(Number(value.toFixed(fractionDigits)));

/** The number a stepper shows, or null when it is empty or not a number. */
export function readStepperValue(text: string): number | null {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/** The text after a - (`direction` -1) or + (1) press: the base when empty, else one step, kept in bounds. */
export function stepValue(text: string, direction: 1 | -1, bounds: StepperBounds): string {
  const current = readStepperValue(text);
  if (current === null) return formatStepped(bounds.base, bounds.fractionDigits);
  const next = Math.min(bounds.max, Math.max(bounds.min, current + direction * bounds.step));
  return formatStepped(next, bounds.fractionDigits);
}

/**
 * Typed text kept to what the field can hold: digits, one decimal point when the field has
 * decimals, those decimals at most, and no more whole digits than the maximum has.
 */
export function sanitizeStepperText(text: string, bounds: StepperBounds): string {
  const [whole = '', ...rest] = text.replace(/[^0-9.]/g, '').split('.');
  const wholeDigits = String(Math.trunc(bounds.max)).length;
  const kept = whole.slice(0, wholeDigits);
  if (bounds.fractionDigits === 0 || rest.length === 0) return kept;
  return `${kept}.${rest.join('').slice(0, bounds.fractionDigits)}`;
}

/** Whether - and + can still move the value. An empty field can always start at the base. */
export function stepperLimits(text: string, bounds: StepperBounds): { canDecrease: boolean; canIncrease: boolean } {
  const current = readStepperValue(text);
  if (current === null) return { canDecrease: true, canIncrease: true };
  return { canDecrease: current > bounds.min, canIncrease: current < bounds.max };
}
