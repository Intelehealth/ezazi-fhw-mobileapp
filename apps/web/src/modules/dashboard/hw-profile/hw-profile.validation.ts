import { z } from 'zod';
import { profileSchema } from '../profile/profile.validation';

/**
 * hw-profile.component.ts's `personalInfoForm` — the doctor form's person
 * and contact fields (same validators, reused from profileSchema), minus the
 * doctor-only qualification/specialization/registration/signature fields and
 * State. Ward and facility stay required, as in the Angular source.
 */
export const hwProfileSchema = profileSchema
  .innerType()
  .pick({
    givenName: true,
    middleName: true,
    familyName: true,
    gender: true,
    birthdate: true,
    phoneNumber: true,
    whatsapp: true,
    emailId: true,
    facilityName: true,
    providerWard: true,
  });

export type HwProfileFormValues = z.infer<typeof hwProfileSchema>;
