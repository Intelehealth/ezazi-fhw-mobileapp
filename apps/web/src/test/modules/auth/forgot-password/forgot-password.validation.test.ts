import { describe, expect, it } from 'vitest';
import { forgotPasswordSchema } from '../../../../modules/auth/forgot-password/forgot-password.validation';

describe('forgotPasswordSchema', () => {
  it('rejects an empty username', () => {
    const result = forgotPasswordSchema.safeParse({ username: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Please enter username');
  });

  it('accepts any non-empty username (matches Angular: required only)', () => {
    expect(forgotPasswordSchema.safeParse({ username: 'nurse1' }).success).toBe(true);
  });
});
