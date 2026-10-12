import { z } from 'zod';
import { credentialsFieldShape } from './credentialsFieldSchema';

type Translate = (key: string) => string;

const NAMESPACE = 'login.errors';

export function createLoginFormSchema(t: Translate) {
  return z.object(credentialsFieldShape(t, NAMESPACE));
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginFormSchema>>;
