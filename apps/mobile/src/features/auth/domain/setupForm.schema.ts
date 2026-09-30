import { z } from 'zod';
import { credentialsFieldShape } from './credentialsFieldSchema';

type Translate = (key: string) => string;

const NAMESPACE = 'setup.errors';

export function createSetupFormSchema(t: Translate) {
  return z.object({
    location: z.string().superRefine((value, ctx) => {
      if (!value) {
        ctx.addIssue({ code: 'custom', message: t(`${NAMESPACE}.locationRequired`) });
      }
    }),
    ...credentialsFieldShape(t, NAMESPACE),
  });
}

export type SetupFormValues = z.infer<ReturnType<typeof createSetupFormSchema>>;
