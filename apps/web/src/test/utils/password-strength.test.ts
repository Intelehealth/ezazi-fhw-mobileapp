import { describe, expect, it } from 'vitest';
import {
  checkPasswordStrength,
  hasLowerCase,
  hasNumber,
  hasSpecialCharacter,
  hasUpperCase,
} from '../../utils/password-strength';

describe('password-strength helpers', () => {
  it.each([
    ['abc', true],
    ['ABC', false],
    ['123', false],
  ])('hasLowerCase(%s) === %s', (value, expected) => {
    expect(hasLowerCase(value)).toBe(expected);
  });

  it.each([
    ['ABC', true],
    ['abc', false],
  ])('hasUpperCase(%s) === %s', (value, expected) => {
    expect(hasUpperCase(value)).toBe(expected);
  });

  it.each([
    ['a1b', true],
    ['abc', false],
  ])('hasNumber(%s) === %s', (value, expected) => {
    expect(hasNumber(value)).toBe(expected);
  });

  it.each([
    ['a@b', true],
    ['abc', false],
  ])('hasSpecialCharacter(%s) === %s', (value, expected) => {
    expect(hasSpecialCharacter(value)).toBe(expected);
  });
});

describe('checkPasswordStrength', () => {
  it('scores 4 (strong) for 12+ chars with all four classes', () => {
    expect(checkPasswordStrength('Abcdefgh1234$')).toBe(4);
  });

  it('scores 3 (medium) for 8-11 chars with all four classes', () => {
    expect(checkPasswordStrength('Abcdef1$')).toBe(3);
  });

  it('scores 2 (fair) for 8+ chars with upper+lower+number only, no symbol', () => {
    expect(checkPasswordStrength('Abcdefg1')).toBe(2);
  });

  it('scores 1 (low) for anything else', () => {
    expect(checkPasswordStrength('abc')).toBe(1);
    expect(checkPasswordStrength('')).toBe(1);
  });
});
