import { z } from 'zod';

/**
 * Matches profile.component.ts's `personalInfoForm` validators exactly
 * (intelehealth-doctor-webapp): name fields are letters-only, email uses the
 * form's own lowercase-only pattern, and `otherQualification` is only
 * required (letters/commas/spaces) when `qualification === 'Other'` — the
 * same conditional the Angular component applies via
 * `setValidators`/`clearValidators` on that control. `visitState` stays
 * optional with a letters-only pattern, matching the Angular field having no
 * `Validators.required` of its own.
 */
const NAME_PATTERN = /^[A-Za-z]*$/;
const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;
const STATE_PATTERN = /^[A-Za-z ]*$/;
const OTHER_QUALIFICATION_PATTERN = /^[A-Za-z, ]*$/;

export const profileSchema = z
  .object({
    givenName: z
      .string()
      .min(1, 'Enter first name')
      .regex(NAME_PATTERN, 'Enter alphabates only'),
    middleName: z
      .string()
      .min(1, 'Enter middle name')
      .regex(NAME_PATTERN, 'Enter alphabates only'),
    familyName: z
      .string()
      .min(1, 'Enter last name')
      .regex(NAME_PATTERN, 'Enter alphabates only'),
    gender: z.enum(['M', 'F', 'U'], {
      errorMap: () => ({ message: 'Select gender' }),
    }),
    birthdate: z.string().min(1, 'Enter DOB'),
    phoneNumber: z.string().min(1, 'Enter phone number'),
    whatsapp: z.string().min(1, 'Enter whatsApp number'),
    emailId: z
      .string()
      .min(1, 'Enter email')
      .regex(EMAIL_PATTERN, 'Enter valid email'),
    visitState: z
      .string()
      .regex(STATE_PATTERN, 'State should contains alphabates only')
      .optional()
      .or(z.literal('')),
    qualification: z.string().min(1, 'Select qualification'),
    otherQualification: z.string().optional().or(z.literal('')),
    specialization: z.string().min(1, 'Select specialization'),
    registrationNumber: z.string().min(1, 'Enter registration number'),
    facilityName: z.string().min(1, 'Select facility name'),
    providerWard: z.string().min(1, 'Select ward'),
    textOfSign: z.string().min(1, 'Enter signature letters'),
    fontOfSign: z.string().min(1, 'Select Signature'),
  })
  .superRefine((values, ctx) => {
    if (values.qualification !== 'Other') return;

    if (!values.otherQualification?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['otherQualification'],
        message: 'Enter other qualification',
      });
    } else if (!OTHER_QUALIFICATION_PATTERN.test(values.otherQualification)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['otherQualification'],
        message: 'Other qualification should contain alphabates only',
      });
    }
  });

export type ProfileFormValues = z.infer<typeof profileSchema>;
