import { z } from 'zod';
import { clientConfig } from '@/core/config/clients';

type Translate = (key: string) => string;

export const PHONE_REGEX = new RegExp(`^\\d{${clientConfig.phone.numberLength}}$`);

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
