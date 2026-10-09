import { describe, expect, it } from 'vitest';
import { setupNewPasswordSchema } from '../../../../modules/auth/setup-new-password/setup-new-password.validation';

describe('setupNewPasswordSchema', () => {
  it('rejects an empty password/confirmPassword', () => {
    const result = setupNewPasswordSchema.safeParse({ password: '', confirmPassword: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = setupNewPasswordSchema.safeParse({
      password: 'Ab1$',
      confirmPassword: 'Ab1$',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when password and confirmPassword do not match', () => {
    const result = setupNewPasswordSchema.safeParse({
      password: 'Abcdefg1',
      confirmPassword: 'Different1',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['confirmPassword']);
    expect(result.error?.issues[0].message).toBe(
      "Password and Confirm Password doesn't match."
    );
  });

  it('accepts a matching pair of at-least-8-char passwords regardless of complexity', () => {
    // The upper/lower/number/symbol mix is a submit-time toast in the
    // component, not a blocking schema rule (see the file's own comment).
    expect(
      setupNewPasswordSchema.safeParse({
        password: 'abcdefgh',
        confirmPassword: 'abcdefgh',
      }).success
    ).toBe(true);
  });
});
