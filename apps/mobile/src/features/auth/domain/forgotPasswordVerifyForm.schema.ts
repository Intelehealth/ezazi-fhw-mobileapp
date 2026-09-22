import { z } from 'zod';

type Translate = (key: string) => string;

// Figma — 4-digit OTP (confirmed 2026-09-16; supersedes the legacy 6-digit flow)
export const OTP_LENGTH = 4;

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
