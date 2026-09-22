import { z } from 'zod';

type Translate = (key: string) => string;

// 6-digit OTP (confirmed 2026-09-22; supersedes the earlier 4-digit Figma spec)
export const OTP_LENGTH = 6;

export function createForgotPasswordVerifyFormSchema(t: Translate) {
  return z.object({
    otp: z.string().superRefine((value, ctx) => {
      if (value.length < OTP_LENGTH) {
        ctx.addIssue({ code: 'custom', message: t('forgotPassword.verify.errors.otpRequired') });
      }
    }),
  });
}

export type ForgotPasswordVerifyFormValues = z.infer<ReturnType<typeof createForgotPasswordVerifyFormSchema>>;
