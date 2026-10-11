import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Clinicians and their attributes. `useruuid` is a separate identifier space from `uuid`.

export const provider = sqliteTable('tbl_provider', {
  uuid: text('uuid').primaryKey(),
  identifier: text('identifier'),
  given_name: text('given_name'),
  family_name: text('family_name'),
  role: text('role'),
  useruuid: text('useruuid'),
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
