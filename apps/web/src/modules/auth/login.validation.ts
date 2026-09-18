import { z } from 'zod';

/**
 * zod, not yup — the migration guide (§2) left this open, and
 * intelehealth-hw-webapp-react's own convention is yup, but apps/mobile
 * (this monorepo's other app) already depends on zod (^3.23.8, see
 * apps/mobile/package.json) for its own form validation. Matching that
 * keeps one validation idiom across both apps in this monorepo rather than
 * introducing a second library that only the web app uses.
 */
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
