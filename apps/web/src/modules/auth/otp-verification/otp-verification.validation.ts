import { z } from 'zod';

/** Matches otpVerificationForm's FormControl: required, minLength(6), maxLength(6), digits only. */
export const otpSchema = z.object({
  otp: z
    .string()
    .min(1, 'Please enter otp')
    .length(6, 'Please enter valid otp')
    .regex(/^\d+$/, 'Please enter valid otp'),
});

export type OtpFormValues = z.infer<typeof otpSchema>;
