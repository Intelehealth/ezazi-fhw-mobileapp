import { z } from 'zod';
import { clientConfig } from '@/core/config/clients';
import { PROVIDER_ROLE_NURSE } from '@/core/db/constants/literals';

type Translate = (key: string) => string;

export const PHONE_REGEX = new RegExp(`^\\d{${clientConfig.phone.numberLength}}$`);

/** Role value (in the requestOtp response's `roles`) that marks a health-worker account. */
export const HEALTH_WORKER_ROLE = PROVIDER_ROLE_NURSE;

const NAMESPACE = 'forgotPassword.request.errors';

export function createForgotPasswordRequestFormSchema(t: Translate) {
  return z.object({
    phoneNumber: z.string().superRefine((value, ctx) => {
      const trimmed = value.trim();
      if (!trimmed) {
        ctx.addIssue({ code: 'custom', message: t(`${NAMESPACE}.phoneRequired`) });
      } else if (!PHONE_REGEX.test(trimmed)) {
        ctx.addIssue({ code: 'custom', message: t(`${NAMESPACE}.phoneInvalid`) });
      }
    }),
  });
}

export type ForgotPasswordRequestFormValues = z.infer<ReturnType<typeof createForgotPasswordRequestFormSchema>>;
