import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

/**
 * Offline SQLite schema (OpenMRS data model), ported 1:1 from the Android /
 * WatermelonDB layer. See ARCHITECTURE_RULES §6:
 *  - `uuid` is the real PRIMARY KEY (Android/Java-UUID format) — except
 *    tbl_location (keys on `locationuuid`) and tbl_user_credentials (no uuid in
 *    Android → synthetic autoincrement id).
 *  - `sync` (dirty flag: 'false'/'true') and `voided` (soft-delete: '0'/'1') are
 *    kept as TEXT with their Android defaults and are managed by the sync engine.
 *  - Every column is TEXT unless noted; optional columns are nullable.
 *  - Indexes: FK/lookup columns and the `sync` dirty flag are indexed per table
 *    (third argument of each `sqliteTable`). The sync engine scans on `sync`
 *    and joins on the *uuid columns, so keep these in step with its queries.
 */

export const patient = sqliteTable('tbl_patient', {
  uuid: text('uuid').primaryKey(),
  openmrs_id: text('openmrs_id'),
  first_name: text('first_name'),
  middle_name: text('middle_name'),
  last_name: text('last_name'),
  date_of_birth: text('date_of_birth'),
  phone_number: text('phone_number'),
  address1: text('address1'),
  address2: text('address2'),
  city_village: text('city_village'),
  state_province: text('state_province'),
  postal_code: text('postal_code'),
  country: text('country'),
  gender: text('gender'),
  sdw: text('sdw'),
  creatoruuid: text('creatoruuid'),
  occupation: text('occupation'),
  patient_photo: text('patient_photo'),
  economic_status: text('economic_status'),
  education_status: text('education_status'),
  caste: text('caste'),
  dead: text('dead'),
  dateCreated: text('dateCreated'),
  modified_date: text('modified_date'),
  voided: text('voided').notNull().default('0'),
  sync: text('sync').notNull().default('false'),
}, (table) => [
  index('idx_tbl_patient_sync').on(table.sync),
]);

export const patientAttribute = sqliteTable('tbl_patient_attribute', {
  uuid: text('uuid').primaryKey(),
  value: text('value'),
  person_attribute_type_uuid: text('person_attribute_type_uuid'),
  patientuuid: text('patientuuid'),
  modified_date: text('modified_date'),
  voided: text('voided').notNull().default('0'),
  sync: text('sync').notNull().default('false'),
}, (table) => [
  index('idx_tbl_patient_attribute_patientuuid').on(table.patientuuid),
  index('idx_tbl_patient_attribute_sync').on(table.sync),
]);

export const patientAttributeMaster = sqliteTable('tbl_patient_attribute_master', {
  uuid: text('uuid').primaryKey(),
  name: text('name'),
  modified_date: text('modified_date'),
  voided: text('voided').notNull().default('0'),
  sync: text('sync').notNull().default('false'),
}, (table) => [
  index('idx_tbl_patient_attribute_master_sync').on(table.sync),
]);

export const visit = sqliteTable('tbl_visit', {
  uuid: text('uuid').primaryKey(),
  patientuuid: text('patientuuid'),
  startdate: text('startdate'),
  enddate: text('enddate'),
  visit_type_uuid: text('visit_type_uuid'),
  locationuuid: text('locationuuid'),
  creator: text('creator'),
  modified_date: text('modified_date'),
  isdownloaded: text('isdownloaded').notNull().default('false'),
  voided: text('voided').notNull().default('0'),
  sync: text('sync').notNull().default('false'),
  issubmitted: integer('issubmitted').notNull().default(0),
}, (table) => [
  index('idx_tbl_visit_patientuuid').on(table.patientuuid),
  index('idx_tbl_visit_locationuuid').on(table.locationuuid),
  index('idx_tbl_visit_sync').on(table.sync),
]);

export const visitAttribute = sqliteTable('tbl_visit_attribute', {
  uuid: text('uuid').primaryKey(),
  visit_uuid: text('visit_uuid'),
  value: text('value'),
  visit_attribute_type_uuid: text('visit_attribute_type_uuid'),
  voided: text('voided'),
  sync: text('sync'),
}, (table) => [
  index('idx_tbl_visit_attribute_visit_uuid').on(table.visit_uuid),
  index('idx_tbl_visit_attribute_sync').on(table.sync),
]);

export const encounter = sqliteTable('tbl_encounter', {
  uuid: text('uuid').primaryKey(),
  visituuid: text('visituuid'),
  encounter_time: text('encounter_time'),
  provider_uuid: text('provider_uuid'),
  encounter_type_uuid: text('encounter_type_uuid'),
  modified_date: text('modified_date'),
  sync: text('sync').notNull().default('false'),
  voided: text('voided').notNull().default('0'),
  privacynotice_value: text('privacynotice_value'),
}, (table) => [
  index('idx_tbl_encounter_visituuid').on(table.visituuid),
  index('idx_tbl_encounter_sync').on(table.sync),
]);

export const obs = sqliteTable('tbl_obs', {
  uuid: text('uuid').primaryKey(),
  encounteruuid: text('encounteruuid'),
  conceptuuid: text('conceptuuid'),
  value: text('value'),
  comment: text('comment'),
  creator: text('creator'),
  creatoruuid: text('creatoruuid'),
  voided: text('voided').notNull().default('0'),
  obsservermodifieddate: text('obsservermodifieddate'),
  modified_date: text('modified_date'),
  created_date: text('created_date'),
  sync: text('sync').notNull().default('false'),
}, (table) => [
  index('idx_tbl_obs_encounteruuid').on(table.encounteruuid),
  index('idx_tbl_obs_conceptuuid').on(table.conceptuuid),
  index('idx_tbl_obs_sync').on(table.sync),
]);

export const location = sqliteTable('tbl_location', {
  name: text('name'),
  locationuuid: text('locationuuid').primaryKey(),
  retired: integer('retired'),
  modified_date: text('modified_date'),
  voided: text('voided').notNull().default('0'),
  sync: text('sync').notNull().default('false'),
}, (table) => [
  index('idx_tbl_location_sync').on(table.sync),
]);

export const provider = sqliteTable('tbl_provider', {
  uuid: text('uuid').primaryKey(),
  identifier: text('identifier'),
  given_name: text('given_name'),
  family_name: text('family_name'),
  role: text('role'),
  useruuid: text('useruuid'),
  voided: text('voided').notNull().default('0'),
  modified_date: text('modified_date'),
  sync: text('sync').notNull().default('false'),
}, (table) => [
  index('idx_tbl_provider_sync').on(table.sync),
]);

export const providerAttribute = sqliteTable('tbl_provider_attribute', {
  uuid: text('uuid').primaryKey(),
  provideruuid: text('provideruuid'),
  attributetypeuuid: text('attributetypeuuid'),
  value: text('value'),
  voided: text('voided'),
}, (table) => [
  index('idx_tbl_provider_attribute_provideruuid').on(table.provideruuid),
]);

export const drSpeciality = sqliteTable('tbl_dr_speciality', {
  uuid: text('uuid').primaryKey(),
  provideruuid: text('provideruuid'),
  attributetypeuuid: text('attributetypeuuid'),
  value: text('value'),
  voided: text('voided'),
}, (table) => [
  index('idx_tbl_dr_speciality_provideruuid').on(table.provideruuid),
]);

export const uuidDictionary = sqliteTable('tbl_uuid_dictionary', {
  uuid: text('uuid').primaryKey(),
  name: text('name'),
});

export const imageRecords = sqliteTable('tbl_image_records', {
  uuid: text('uuid').primaryKey(),
  patientuuid: text('patientuuid'),
  visituuid: text('visituuid'),
  encounteruuid: text('encounteruuid'),
  image_path: text('image_path'),
  obs_time_date: text('obs_time_date'),
  image_type: text('image_type'),
  voided: text('voided').notNull().default('0'),
  sync: text('sync').notNull().default('false'),
}, (table) => [
  index('idx_tbl_image_records_patientuuid').on(table.patientuuid),
  index('idx_tbl_image_records_visituuid').on(table.visituuid),
  index('idx_tbl_image_records_encounteruuid').on(table.encounteruuid),
  index('idx_tbl_image_records_sync').on(table.sync),
]);

// Android has no uuid PK here (WatermelonDB auto-generated an id) → synthetic PK.
export const userCredentials = sqliteTable('tbl_user_credentials', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username'),
  password: text('password'),
  creator_uuid_cred: text('creator_uuid_cred'),
  chwname: text('chwname'),
  provider_uuid_cred: text('provider_uuid_cred'),
});

export const rtcConnectionLog = sqliteTable('tbl_rtc_connection_log', {
  uuid: text('uuid').primaryKey(),
  visit_uuid: text('visit_uuid'),
  connection_info: text('connection_info'),
}, (table) => [
  index('idx_tbl_rtc_connection_log_visit_uuid').on(table.visit_uuid),
]);

/**
 * Local DB-lifecycle bookkeeping — a single row, always `id = 1`.
 *
 * Never synced (hence no `sync`/`voided` columns), and deliberately NOT the
 * schema version: Drizzle's own journal owns that, so a future migration must
 * never re-trigger hydration. See ARCHITECTURE_RULES §6 "DB lifecycle".
 */
export const appState = sqliteTable('tbl_app_state', {
  id: integer('id').primaryKey(),
  hydration_state: text('hydration_state').notNull().default('pending'),
  hydration_attempts: integer('hydration_attempts').notNull().default(0),
  last_error: text('last_error'),
  staged_manifest: text('staged_manifest'),
  updated_at: text('updated_at'),
});

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
