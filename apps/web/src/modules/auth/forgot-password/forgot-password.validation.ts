import { z } from 'zod';

/** Matches forgot-password.component.ts's FormGroup exactly: username is Validators.required only. */
export const forgotPasswordSchema = z.object({
  username: z.string().min(1, 'Please enter username'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
