import { z } from 'zod';

type Translate = (key: string) => string;

/**
 * Shared USERNAME/PASSWORD shape for Setup and Login — same rules
 * (SetupActivity.attemptLogin() / LoginActivity), only the i18n namespace
 * differs per screen. superRefine (not chained .min()s) so a truly empty
 * password reports "required", not "8+ characters", matching legacy copy.
 */
export function credentialsFieldShape(t: Translate, namespace: string) {
  return {
    username: z.string().superRefine((value, ctx) => {
      if (!value.trim()) {
        ctx.addIssue({ code: 'custom', message: t(`${namespace}.usernameRequired`) });
      }
    }),
    password: z.string().superRefine((value, ctx) => {
      if (!value) {
        ctx.addIssue({ code: 'custom', message: t(`${namespace}.passwordRequired`) });
      } else if (value.length <= 7) {
        ctx.addIssue({ code: 'custom', message: t(`${namespace}.passwordTooShort`) });
      }
    }),
  };
}
