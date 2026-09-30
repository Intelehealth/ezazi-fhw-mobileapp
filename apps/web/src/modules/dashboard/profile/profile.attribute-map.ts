import type { DoctorProfile } from './profile.types';

export type AttributeMappedField = Extract<
  keyof DoctorProfile,
  | 'phoneNumber'
  | 'whatsapp'
  | 'emailId'
  | 'visitState'
  | 'qualification'
  | 'otherQualification'
  | 'specialization'
  | 'registrationNumber'
  | 'facilityName'
  | 'providerWard'
  | 'textOfSign'
  | 'fontOfSign'
>;

/**
 * DoctorProfile form field <-> OpenMRS provider-attribute display name.
 * Every field here round-trips through `/provider/{uuid}/attribute` as one
 * of these named attribute types instead of its own column — mirrors
 * profile.component.ts's own `switch (attrType.display)` (givenName/
 * middleName/familyName/gender/birthdate live on the OpenMRS `person`/
 * `person name` resources instead — see services/profile.service.ts's
 * updatePerson/savePersonName).
 */
export const ATTRIBUTE_FIELD_MAP: Array<{
  field: AttributeMappedField;
  attributeDisplayName: string;
}> = [
  { field: 'phoneNumber', attributeDisplayName: 'phoneNumber' },
  { field: 'whatsapp', attributeDisplayName: 'whatsapp' },
  { field: 'emailId', attributeDisplayName: 'emailId' },
  { field: 'visitState', attributeDisplayName: 'visitState' },
  { field: 'qualification', attributeDisplayName: 'qualification' },
  { field: 'otherQualification', attributeDisplayName: 'otherQualification' },
  { field: 'specialization', attributeDisplayName: 'specialization' },
  { field: 'registrationNumber', attributeDisplayName: 'registrationNumber' },
  { field: 'facilityName', attributeDisplayName: 'facility_name' },
  { field: 'providerWard', attributeDisplayName: 'provider_ward' },
  { field: 'textOfSign', attributeDisplayName: 'textOfSign' },
  { field: 'fontOfSign', attributeDisplayName: 'fontOfSign' },
];
