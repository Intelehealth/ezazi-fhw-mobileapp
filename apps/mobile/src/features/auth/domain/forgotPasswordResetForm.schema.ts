import { z } from 'zod';

type Translate = (key: string) => string;

// Exact regex from ResetPasswordFragment.java — isValidPassword()
// Requires: ≥1 digit, ≥1 lowercase, ≥1 uppercase, ≥1 symbol from @*#$%^&+=, no spaces, ≥8 chars
export const PASSWORD_REGEX =
  /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@*#$%^&+=])(?=\S+$).{8,}$/;

const NAMESPACE = 'forgotPassword.reset.errors';

export function createForgotPasswordResetFormSchema(t: Translate) {
  return z
    .object({
      newPassword: z.string().superRefine((value, ctx) => {
        if (!value) {
          ctx.addIssue({ code: 'custom', message: t(`${NAMESPACE}.newPasswordRequired`) });
        } else if (!PASSWORD_REGEX.test(value)) {
          ctx.addIssue({ code: 'custom', message: t(`${NAMESPACE}.passwordInvalid`) });
        }
      }),
      confirmPassword: z.string(),
    })
    .superRefine((data, ctx) => {
      if (!data.confirmPassword) {
        ctx.addIssue({
          code: 'custom',
          message: t(`${NAMESPACE}.confirmRequired`),
          path: ['confirmPassword'],
        });
      } else if (data.newPassword && data.confirmPassword !== data.newPassword) {
        ctx.addIssue({
          code: 'custom',
          message: t(`${NAMESPACE}.noMatch`),
          path: ['confirmPassword'],
        });
      }
    });
}

export type ForgotPasswordResetFormValues = z.infer<ReturnType<typeof createForgotPasswordResetFormSchema>>;
