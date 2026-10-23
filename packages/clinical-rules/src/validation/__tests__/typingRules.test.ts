import { describe, it, expect } from 'vitest';
import {
  checkDiastolicTyping,
  checkInfusionRateOnBlur,
  checkInfusionRateTyping,
  checkStrengthTyping,
  systolicClearsDiastolic,
} from '../typingRules';
import type { TypingCheck } from '../types';

const kind = (check: TypingCheck) => (check.kind === 'warn' || check.kind === 'clear' ? [check.kind, check.error.reason] : [check.kind]);

describe('while typing, as PartogramQueryListingAdapter does', () => {
  it('diastolic: needs systolic first, must be below it (adapter 880-901)', () => {
    expect(kind(checkDiastolicTyping('', '80'))).toEqual(['clear', 'enterSystolicFirst']);
    expect(kind(checkDiastolicTyping(null, '80'))).toEqual(['clear', 'enterSystolicFirst']);
    expect(kind(checkDiastolicTyping('120', '120'))).toEqual(['clear', 'notBelowSystolic']);
    expect(kind(checkDiastolicTyping('120', '130'))).toEqual(['clear', 'notBelowSystolic']);
    expect(kind(checkDiastolicTyping('120', '119'))).toEqual(['accept']);
    expect(kind(checkDiastolicTyping('', ''))).toEqual(['accept']);
  });

  it('systolic: clears a diastolic above it, but not an equal one (adapter 857-878)', () => {
    expect(systolicClearsDiastolic('80', '90')).toBe(true);
    expect(systolicClearsDiastolic('90', '90')).toBe(false);
    expect(systolicClearsDiastolic('120', '80')).toBe(false);
    expect(systolicClearsDiastolic('120', '')).toBe(false);
    expect(systolicClearsDiastolic('', '80')).toBe(false);
  });

  it('oxytocin strength: 1 to 10, waits on an unfinished decimal (adapter 1236-1262)', () => {
    const cases: [string, unknown[]][] = [
      ['', ['accept']],
      ['1.', ['pending']],
      ['.', ['pending']],
      ['0', ['clear', 'outOfRange']],
      ['0.9', ['clear', 'outOfRange']],
      ['1', ['accept']],
      ['2.25', ['accept']],
      ['10', ['accept']],
      ['10.5', ['clear', 'outOfRange']],
      ['11', ['clear', 'outOfRange']],
    ];
    for (const [text, expected] of cases) expect(kind(checkStrengthTyping(text, 'default'))).toEqual(expected);
  });

  it('infusion rate: below 5 warns and is kept, above 60 is cleared (adapter 997-1016)', () => {
    const cases: [string, unknown[]][] = [
      ['', ['accept']],
      ['1', ['warn', 'outOfRange']],
      ['4', ['warn', 'outOfRange']],
      ['5', ['accept']],
      ['60', ['accept']],
      ['61', ['clear', 'outOfRange']],
      ['99', ['clear', 'outOfRange']],
    ];
    for (const [text, expected] of cases) expect(kind(checkInfusionRateTyping(text, 'default'))).toEqual(expected);
  });

  it('infusion rate on leaving the box: below 5 is cleared (adapter 986-995)', () => {
    expect(kind(checkInfusionRateOnBlur('4', 'default'))).toEqual(['clear', 'outOfRange']);
    expect(kind(checkInfusionRateOnBlur('5', 'default'))).toEqual(['accept']);
    expect(kind(checkInfusionRateOnBlur('', 'default'))).toEqual(['accept']);
  });

  it('waits on text that is not a number yet, and accepts empty input', () => {
    expect(kind(checkStrengthTyping(null, 'default'))).toEqual(['accept']);
    expect(kind(checkStrengthTyping('1.2.3', 'default'))).toEqual(['pending']);
    expect(kind(checkStrengthTyping('abc', 'default'))).toEqual(['pending']);
    expect(kind(checkInfusionRateTyping(null, 'default'))).toEqual(['accept']);
    expect(kind(checkInfusionRateTyping('5.5', 'default'))).toEqual(['pending']); // the number keyboard cannot type it
    expect(kind(checkInfusionRateTyping('abc', 'default'))).toEqual(['pending']);
  });

  it('leaves blood pressure alone when a value is missing or not a number', () => {
    expect(kind(checkDiastolicTyping('120', null))).toEqual(['accept']);
    expect(kind(checkDiastolicTyping('12a', '80'))).toEqual(['accept']);
    expect(systolicClearsDiastolic(null, '80')).toBe(false);
    expect(systolicClearsDiastolic('8o', '90')).toBe(false);
  });

  it('names the input and range in the error', () => {
    const check = checkInfusionRateTyping('61', 'default');
    expect(check.kind === 'clear' && [check.error.id, check.error.range?.min, check.error.range?.max]).toEqual([
      'infusionRate',
      5,
      60,
    ]);
  });
});
