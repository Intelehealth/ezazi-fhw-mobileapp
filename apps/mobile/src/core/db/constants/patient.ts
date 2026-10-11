/**
 * Person attribute type uuids — written to
 * `tbl_patient_attribute.person_attribute_type_uuid` — and the identifier type.
 * Ported verbatim from the legacy `UuidDictionary.java`. The 15 admission values
 * are NOT here: this module records those as obs. See `obs.ts`.
 */

// Identifies the patient record itself.
export const IDENTIFIER_OPENMRS_ID = '05a29f94-c0ed-11e2-94be-8c13b969e334';

// Demographics captured once, at registration.
export const ATTRIBUTE_PHONE_NUMBER = '14d4f066-15f5-102d-96e4-000c29c2a5d7';
export const ATTRIBUTE_CASTE = '5a889d96-0c84-4a04-88dc-59a6e37db2d3';
export const ATTRIBUTE_EDUCATION_LEVEL = '1c718819-345c-4368-aad6-d69b4c267db7';
export const ATTRIBUTE_ECONOMIC_STATUS = 'f4af0ef3-579c-448a-8157-750283409122';
export const ATTRIBUTE_SON_WIFE_DAUGHTER = '1b2f34f7-2bf8-4ef7-9736-f5b858afc160';
export const ATTRIBUTE_OCCUPATION = 'ecdaadb6-14a0-4ed9-b5b7-cfed87b44b87';
export const ATTRIBUTE_HEALTH_CENTER = '8d87236c-c2cc-11de-8d13-0010c6dffd0f';

/**
 * Registration bookkeeping. One of the four values that stay patient attributes
 * in every region because they have no obs equivalent.
 */
export const PATIENT_REGISTRATION_START_DATE_TIME = 'd2050806-33b5-47ee-b72e-ff9230222ea6';
