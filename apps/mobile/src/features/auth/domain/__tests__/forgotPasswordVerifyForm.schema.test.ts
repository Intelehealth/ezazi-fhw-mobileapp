import { OTP_LENGTH, createForgotPasswordVerifyFormSchema } from '../forgotPasswordVerifyForm.schema';

const t = (key: string) => key;

describe('OTP_LENGTH', () => {
  it('is 6 digits', () => {
    expect(OTP_LENGTH).toBe(6);
  });
});

describe('createForgotPasswordVerifyFormSchema', () => {

  it(`accepts an ${OTP_LENGTH}-digit code`, () => {
    const schema = createForgotPasswordVerifyFormSchema(t);
    const result = schema.safeParse({ otp: '1'.repeat(OTP_LENGTH) });
    expect(result.success).toBe(true);
  });

  it('reports otpRequired for a short/empty code', () => {
    const schema = createForgotPasswordVerifyFormSchema(t);
    const result = schema.safeParse({ otp: '1'.repeat(OTP_LENGTH - 1) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('forgotPassword.verify.errors.otpRequired');
    }
  });

  it('reports otpRequired for a completely empty code', () => {
    const schema = createForgotPasswordVerifyFormSchema(t);
    const result = schema.safeParse({ otp: '' });
    expect(result.success).toBe(false);
  });

});
