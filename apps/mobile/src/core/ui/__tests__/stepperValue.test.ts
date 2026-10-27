import { readStepperValue, sanitizeStepperText, stepValue, stepperLimits } from '../stepperValue';

const FHR = { min: 50, max: 200, base: 110, step: 1, fractionDigits: 0 };
const TEMPERATURE = { min: 90, max: 110, base: 95, step: 0.1, fractionDigits: 1 };

describe('stepValue', () => {
  it('fills the base on the first press of an empty field, either way', () => {
    expect(stepValue('', 1, FHR)).toBe('110');
    expect(stepValue('', -1, FHR)).toBe('110');
  });

  it('moves one step and stays within min and max', () => {
    expect(stepValue('120', 1, FHR)).toBe('121');
    expect(stepValue('200', 1, FHR)).toBe('200');
    expect(stepValue('50', -1, FHR)).toBe('50');
    expect(stepValue('30', 1, FHR)).toBe('50');
  });

  it('keeps decimals free of floating-point noise', () => {
    expect(stepValue('97.1', 1, TEMPERATURE)).toBe('97.2');
    expect(stepValue('97', -1, TEMPERATURE)).toBe('96.9');
  });
});

describe('sanitizeStepperText', () => {
  it('keeps digits only, no more whole digits than the maximum', () => {
    expect(sanitizeStepperText('1a2-3', FHR)).toBe('123');
    expect(sanitizeStepperText('1234', FHR)).toBe('123');
    expect(sanitizeStepperText('12.5', FHR)).toBe('12');
  });

  it('keeps one decimal point and the field\'s decimals', () => {
    expect(sanitizeStepperText('97.56', TEMPERATURE)).toBe('97.5');
    expect(sanitizeStepperText('97.', TEMPERATURE)).toBe('97.');
    expect(sanitizeStepperText('9.7.5', TEMPERATURE)).toBe('9.7');
  });
});

describe('readStepperValue / stepperLimits', () => {
  it('reads a number, and nothing for empty text', () => {
    expect(readStepperValue(' 98 ')).toBe(98);
    expect(readStepperValue('')).toBeNull();
  });

  it('blocks - at the minimum and + at the maximum', () => {
    expect(stepperLimits('50', FHR)).toEqual({ canDecrease: false, canIncrease: true });
    expect(stepperLimits('200', FHR)).toEqual({ canDecrease: true, canIncrease: false });
    expect(stepperLimits('', FHR)).toEqual({ canDecrease: true, canIncrease: true });
  });
});
