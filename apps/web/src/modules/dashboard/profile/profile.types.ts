/**
 * Doctor profile domain type — mirrors profile.component.ts's
 * `personalInfoForm` field set (intelehealth-doctor-webapp) field-for-field,
 * so this module can stay a straight port once the profile API lands.
 *
 * `gender` keeps the M/F/U codes the reference form/EMR use rather than
 * spelling out "Male"/"Female"/"Other" here — the component layer maps the
 * code to a label, exactly like the Angular template's inline ternary.
 */
export type Gender = 'M' | 'F' | 'U';

export interface DoctorProfile {
  givenName: string;
  middleName: string;
  familyName: string;
  gender: Gender;
  birthdate: string;
  phoneNumber: string;
  whatsapp: string;
  emailId: string;
  visitState: string;
  qualification: string;
  otherQualification: string;
  specialization: string;
  registrationNumber: string;
  facilityName: string;
  providerWard: string;
  textOfSign: string;
  /** One of SIGNATURE_FONTS's `name` values (see profile.component.tsx) — the font-family the signature is rendered in, both in the picker and the view-mode signature box. */
  fontOfSign: string;
  photoUrl: string | null;
}
