import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Clinicians and their attributes. FOUR identifier spaces on one row, all distinct:
// `uuid`, `useruuid`, `providerId` (OpenMRS's numeric row id) and `identifier`.
// Column names are the wire's, mixed casing included — verified against a real
// providerlist.json, which carries every column below except `imagePath`.

export const provider = sqliteTable('tbl_provider', {
  uuid: text('uuid').primaryKey(),
  identifier: text('identifier'),
  given_name: text('given_name'),
  middle_name: text('middle_name'),
  family_name: text('family_name'),
  gender: text('gender'),
  dateofbirth: text('dateofbirth'), // all lowercase on the wire, unlike its neighbours
  emailId: text('emailId'),
  telephoneNumber: text('telephoneNumber'),
  countryCode: text('countryCode'),
  role: text('role'),
  useruuid: text('useruuid'),
  providerId: text('providerId'),
  imagePath: text('imagePath'), // device-local path, never sent by the server
  voided: integer('voided').notNull().default(0),
  modified_date: text('modified_date'),
  sync: integer('sync', { mode: 'boolean' }).notNull().default(false),
}, (table) => [
  index('idx_tbl_provider_sync').on(table.sync),
]);

export const providerAttribute = sqliteTable('tbl_provider_attribute', {
  uuid: text('uuid').primaryKey(),
  provideruuid: text('provideruuid'),
  attributetypeuuid: text('attributetypeuuid'),
  value: text('value'),
  voided: integer('voided').notNull().default(0),
}, (table) => [
  index('idx_tbl_provider_attribute_provideruuid').on(table.provideruuid),
]);

export const drSpeciality = sqliteTable('tbl_dr_speciality', {
  uuid: text('uuid').primaryKey(),
  provideruuid: text('provideruuid'),
  attributetypeuuid: text('attributetypeuuid'),
  value: text('value'),
  voided: integer('voided').notNull().default(0),
}, (table) => [
  index('idx_tbl_dr_speciality_provideruuid').on(table.provideruuid),
]);
