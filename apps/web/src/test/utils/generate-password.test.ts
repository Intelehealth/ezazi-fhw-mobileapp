import { describe, expect, it } from 'vitest';
import { generatePassword } from '../../utils/generate-password';
import {
  hasLowerCase,
  hasNumber,
  hasSpecialCharacter,
  hasUpperCase,
} from '../../utils/password-strength';

describe('generatePassword', () => {
  it('always returns exactly 8 characters (guards the off-by-one index fix)', () => {
    for (let i = 0; i < 50; i++) {
      expect(generatePassword()).toHaveLength(8);
    }
  });

  it('always satisfies all four character classes', () => {
    for (let i = 0; i < 50; i++) {
      const password = generatePassword();
      expect(hasLowerCase(password)).toBe(true);
      expect(hasUpperCase(password)).toBe(true);
      expect(hasNumber(password)).toBe(true);
      expect(hasSpecialCharacter(password)).toBe(true);
    }
  });

  it('only uses characters from the documented charset', () => {
    const charset = new Set(
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789*@$&'
    );
    const password = generatePassword();
    for (const char of password) {
      expect(charset.has(char)).toBe(true);
    }
  });
});
