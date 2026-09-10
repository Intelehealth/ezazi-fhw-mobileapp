import { describe, expect, it } from 'vitest';
import { loginSchema } from '../../../modules/auth/login.validation';

describe('loginSchema', () => {
  it('accepts valid credentials with a solved captcha', () => {
    const result = loginSchema.safeParse({
      username: 'nurse1',
      password: 'secret',
      recaptcha: 'a-real-token',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing username', () => {
    const result = loginSchema.safeParse({
      username: '',
      password: 'secret',
      recaptcha: 'token',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Please enter username');
  });

  it('rejects a missing password (no minimum length, matching the Angular form)', () => {
    const result = loginSchema.safeParse({
      username: 'nurse1',
      password: '',
      recaptcha: 'token',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Please enter valid password'
    );
  });

  it('rejects an unsolved captcha', () => {
    const result = loginSchema.safeParse({
      username: 'nurse1',
      password: 'secret',
      recaptcha: '',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Please confirm you are not a robot'
    );
  });
});
