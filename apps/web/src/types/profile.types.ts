/**
 * OpenMRS REST request/response shapes for the doctor-profile feature —
 * mirrors intelehealth-doctor-webapp's ProviderService/ProfileService/
 * AuthService contracts (services/profile.service.ts calls these against
 * env.OPENMRS_URL, the OpenMRS REST API itself — a different server than
 * both env.PORTAL_URL and the auth-gateway). Local to apps/web for now,
 * same as auth.types.ts.
 *
 * OpenMRS stores every doctor-editable field (email, phone, qualification,
 * signature, …) as a "provider attribute" — a {attributeType, value} pair,
 * not its own column — rather than fetching each type's UUID ahead of time,
 * the app fetches the full list once (ProviderAttributeType[]) and resolves
 * display-name -> uuid at runtime. See modules/dashboard/profile's
 * ATTRIBUTE_FIELD_MAP for the display-name <-> DoctorProfile field mapping.
 */

export interface ProviderAttributeType {
  uuid: string;
  display: string;
}

export interface ProviderAttribute {
  uuid: string;
  attributeType: ProviderAttributeType;
  value: string;
  voided: boolean;
}

export interface PersonPreferredName {
  uuid: string;
  givenName: string;
  middleName: string;
  familyName: string;
}

export interface OpenMrsPerson {
  uuid: string;
  display: string;
  gender: string;
  age: number | null;
  birthdate: string | null;
  preferredName: PersonPreferredName | null;
}

export interface OpenMrsProvider {
  uuid: string;
  person: OpenMrsPerson;
  attributes: ProviderAttribute[];
}

export interface OpenMrsLocation {
  uuid: string;
  display: string;
}

/** GET {OPENMRS_URL}/session response — only `authenticated` is used (see profileService.createSession). */
export interface OpenMrsSessionResponse {
  sessionId: string;
  authenticated: boolean;
}

export interface UpdatePersonPayload {
  gender: string;
  age: number;
  birthdate: string;
}

export interface PersonNamePayload {
  givenName: string;
  middleName: string;
  familyName: string;
  preferred: true;
  prefix: null;
}

export interface UpdateProfileImagePayload {
  person: string;
  /** Base64 image data, WITHOUT the leading `data:image/...;base64,` prefix. */
  base64EncodedImage: string;
}

/** Body for POST {MINDMAP_URL}/auth/validateProviderAttribute. */
export interface ValidateProviderAttributePayload {
  attributeType: 'emailId' | 'phoneNumber';
  attributeValue: string;
  providerUuid: string;
}

/** `data: true` means the value is available (not already taken by another provider). */
export interface ValidateProviderAttributeResponse {
  success: boolean;
  data: boolean;
}
