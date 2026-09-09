import { describe, expect, it } from 'vitest';
import { loginSchema } from '../../../modules/auth/login.validation';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({
      username: 'nurse1',
      password: 'secret123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing username', () => {
    const result = loginSchema.safeParse({
      username: '',
      password: 'secret123',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Username is required');
  });

  it('rejects a short password', () => {
    const result = loginSchema.safeParse({
      username: 'nurse1',
      password: '123',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Password must be at least 6 characters'
    );
  });
});
