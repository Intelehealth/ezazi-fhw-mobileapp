import { describe, expect, it } from 'vitest';
import { otpSchema } from '../../../../modules/auth/otp-verification/otp-verification.validation';

describe('otpSchema', () => {
  it('rejects an empty otp', () => {
    const result = otpSchema.safeParse({ otp: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Please enter otp');
  });

  it('rejects an otp that is not exactly 6 digits', () => {
    expect(otpSchema.safeParse({ otp: '12345' }).success).toBe(false);
    expect(otpSchema.safeParse({ otp: '1234567' }).success).toBe(false);
  });

  it('rejects non-numeric characters', () => {
    expect(otpSchema.safeParse({ otp: 'abcdef' }).success).toBe(false);
  });

  it('accepts exactly 6 digits', () => {
    expect(otpSchema.safeParse({ otp: '123456' }).success).toBe(true);
  });
});
