/**
 * The second fake patient, for development builds (EXPO_PUBLIC_DEV_SEED): her visit starts only
 * when the developer taps "Start", and from then on the real card engine drives it.
 * Fictional data only — never a real patient, never real credentials.
 */

export const DEV_LIVE_PATIENT = {
  uuid: 'b7d4f2a0-5c1e-4f3a-9a6b-2d8e7c0f1a11',
  openmrsId: 'EZ-DEV-0002',
  firstName: 'Live',
  lastName: 'Test Patient',
  dateOfBirth: '1997-08-21',
  gender: 'F',
} as const;

export const DEV_LIVE_VISIT_UUID = 'b7d4f2a0-5c1e-4f3a-9a6b-2d8e7c0f1a12';
