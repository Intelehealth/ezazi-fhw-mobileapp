import { z } from 'zod';

/**
 * Matches resetPasswordForm's FormGroup: password/confirmPassword are both
 * required + minLength(8). The upper/lower/number/symbol complexity mix is
 * NOT enforced here — Angular doesn't block on it via the form either, it's
 * a separate submit-time warning toast (see setup-new-password.component.tsx's
 * onSubmit, porting resetPassword()'s hasLowerCase/hasUpperCase/hasNumber/
 * hasSpecialCharacter check). The match check IS blocking here via `.refine`,
 * per this rebuild's spec — Angular's own equivalent is a submit-time toast
 * too, so this is a deliberate, spec-directed deviation from the source.
 */
export const setupNewPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Please enter password')
      .min(8, 'Please enter atleast 8 characters'),
    confirmPassword: z
      .string()
      .min(1, 'Please enter password')
      .min(8, 'Please enter atleast 8 characters'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Password and Confirm Password doesn't match.",
    path: ['confirmPassword'],
  });

export type SetupNewPasswordFormValues = z.infer<typeof setupNewPasswordSchema>;
