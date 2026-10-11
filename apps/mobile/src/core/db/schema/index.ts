/**
 * Offline SQLite schema (OpenMRS model), ported 1:1 from Android. See ARCHITECTURE_RULES §6.
 * `uuid` is the PK, except tbl_location (`locationuuid`) and tbl_user_credentials (synthetic id).
 * `sync`/`voided` are INTEGER mirroring the API: `sync` boolean (wire `syncd`), `voided` 0/1.
 * Every other column is TEXT unless noted; optional columns are nullable.
 * Indexes (3rd arg per table): FK/lookup columns plus `sync` — keep in step with the sync engine.
 */

import { appState, userCredentials } from './app';
import { encounter, obs } from './encounter';
import { imageRecords, rtcConnectionLog } from './media';
import { patient, patientAttribute, patientAttributeMaster } from './patient';
import { location, uuidDictionary } from './reference';
import { drSpeciality, provider, providerAttribute } from './provider';
import { visit, visitAttribute } from './visit';

export * from './app';
export * from './encounter';
export * from './media';
export * from './patient';
export * from './provider';
export * from './reference';
export * from './visit';

/** All tables, for `drizzle(expoDb, { schema })` and drizzle-kit. */
export const schema = {
  appState,
  patient,
  patientAttribute,
  patientAttributeMaster,
  visit,
  visitAttribute,
  encounter,
  obs,
  location,
  provider,
  providerAttribute,
  drSpeciality,
  uuidDictionary,
  imageRecords,
  userCredentials,
  rtcConnectionLog,
};

// Inferred row types (replace the old WatermelonDB Model classes).
export type AppState = typeof appState.$inferSelect;
export type Patient = typeof patient.$inferSelect;
export type PatientAttribute = typeof patientAttribute.$inferSelect;
export type PatientAttributeMaster = typeof patientAttributeMaster.$inferSelect;
export type Visit = typeof visit.$inferSelect;
export type VisitAttribute = typeof visitAttribute.$inferSelect;
export type Encounter = typeof encounter.$inferSelect;
export type Obs = typeof obs.$inferSelect;
export type Location = typeof location.$inferSelect;
export type Provider = typeof provider.$inferSelect;
export type ProviderAttribute = typeof providerAttribute.$inferSelect;
export type DrSpeciality = typeof drSpeciality.$inferSelect;
export type UuidDictionary = typeof uuidDictionary.$inferSelect;
export type ImageRecord = typeof imageRecords.$inferSelect;
export type UserCredentials = typeof userCredentials.$inferSelect;
export type RtcConnectionLog = typeof rtcConnectionLog.$inferSelect;
