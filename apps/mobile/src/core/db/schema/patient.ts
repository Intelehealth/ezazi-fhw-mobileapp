import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// The patient record and its attribute rows. Root of the clinical tree.

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
  voided: integer('voided').notNull().default(0),
  sync: integer('sync', { mode: 'boolean' }).notNull().default(false),
}, (table) => [
  index('idx_tbl_patient_sync').on(table.sync),
]);

export const patientAttribute = sqliteTable('tbl_patient_attribute', {
  uuid: text('uuid').primaryKey(),
  value: text('value'),
  person_attribute_type_uuid: text('person_attribute_type_uuid'),
  patientuuid: text('patientuuid'),
  modified_date: text('modified_date'),
  voided: integer('voided').notNull().default(0),
  sync: integer('sync', { mode: 'boolean' }).notNull().default(false),
}, (table) => [
  index('idx_tbl_patient_attribute_patientuuid').on(table.patientuuid),
  index('idx_tbl_patient_attribute_sync').on(table.sync),
]);

export const patientAttributeMaster = sqliteTable('tbl_patient_attribute_master', {
  uuid: text('uuid').primaryKey(),
  name: text('name'),
  modified_date: text('modified_date'),
  voided: integer('voided').notNull().default(0),
  sync: integer('sync', { mode: 'boolean' }).notNull().default(false),
}, (table) => [
  index('idx_tbl_patient_attribute_master_sync').on(table.sync),
]);
