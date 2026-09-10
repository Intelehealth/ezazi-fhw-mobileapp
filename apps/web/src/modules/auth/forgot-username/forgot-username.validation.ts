import { z } from 'zod';

/**
 * Approximation: forgot-username.component.html's phone field is Angular's
 * ng2TelInput (a full intl-tel-input country-aware widget) — not ported
 * here. This is a reasonable digit-length approximation (7–15 digits,
 * loosely E.164-shaped) rather than a true international-number validator.
 * Also reused verbatim by verification-method.component.tsx (screen 3),
 * whose phone/email tabs are structurally identical to this screen's.
 */
const PHONE_REGEX = /^\d{7,15}$/;

export const phoneContactSchema = z.object({
  phone: z
    .string()
    .min(1, 'Please enter mobile number')
    .regex(PHONE_REGEX, 'Please enter valid mobile number'),
});

export const emailContactSchema = z.object({
  email: z.string().min(1, 'Please enter email').email('Please enter valid email'),
});

export type PhoneContactFormValues = z.infer<typeof phoneContactSchema>;
export type EmailContactFormValues = z.infer<typeof emailContactSchema>;
