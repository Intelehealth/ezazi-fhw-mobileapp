import { z } from 'zod';

/**
 * Matches change-password.component.ts's resetPasswordForm: oldPassword is
 * required, password and confirmPassword are required + minLength(8). Like
 * the Angular source, the new/confirm match and the upper/lower/number/symbol
 * mix are NOT form validators — they are submit-time warning toasts (see
 * change-password.component.tsx's onSubmit).
 */
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Please enter old password'),
  password: z
    .string()
    .min(1, 'Please enter password')
    .min(8, 'Please enter atleast 8 characters'),
  confirmPassword: z
    .string()
    .min(1, 'Please enter password')
    .min(8, 'Please enter atleast 8 characters'),
});

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
