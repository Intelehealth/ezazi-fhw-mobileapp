import { describe, expect, it } from 'vitest';
import {
  emailContactSchema,
  phoneContactSchema,
} from '../../../../modules/auth/forgot-username/forgot-username.validation';

describe('phoneContactSchema', () => {
  it('rejects an empty phone number', () => {
    const result = phoneContactSchema.safeParse({ phone: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Please enter mobile number');
  });

  it('rejects a too-short/non-digit phone number', () => {
    const result = phoneContactSchema.safeParse({ phone: '123' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Please enter valid mobile number');
  });

  it('accepts a plausible digit-only phone number', () => {
    expect(phoneContactSchema.safeParse({ phone: '9876543210' }).success).toBe(true);
  });
});

describe('emailContactSchema', () => {
  it('rejects an empty email', () => {
    const result = emailContactSchema.safeParse({ email: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Please enter email');
  });

  it('rejects a malformed email', () => {
    const result = emailContactSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Please enter valid email');
  });

  it('accepts a well-formed email', () => {
    expect(
      emailContactSchema.safeParse({ email: 'nurse1@example.com' }).success
    ).toBe(true);
  });
});
