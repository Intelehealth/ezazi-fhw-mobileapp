import { z } from 'zod';

/**
 * The phone field is react-international-phone's <PhoneInput> (see
 * contact-tabs.component.tsx), which reports its value in E.164 format —
 * "+" followed by the country's dial code and national number, 7-15 digits
 * total per the E.164 spec. A bare "+91" (dial code only, no digits dialed —
 * what the field holds right after mount/tab-reset, before anything is
 * typed) correctly fails this regex, matching the "please enter a valid
 * number" case rather than looking complete.
 * Also reused verbatim by verification-method.component.tsx (screen 3),
 * whose phone/email tabs are structurally identical to this screen's.
 */
const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

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
