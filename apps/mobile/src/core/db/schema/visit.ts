import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// A visit and its attributes. Ownership lives in VISIT_HOLDER here, not in `creator`.

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
  voided: integer('voided').notNull().default(0),
  sync: integer('sync', { mode: 'boolean' }).notNull().default(false),
  issubmitted: integer('issubmitted').notNull().default(0),
}, (table) => [
  index('idx_tbl_visit_patientuuid').on(table.patientuuid),
  index('idx_tbl_visit_locationuuid').on(table.locationuuid),
  index('idx_tbl_visit_sync').on(table.sync),
]);

// Note `visit_uuid`, snake-cased — tbl_encounter spells the same link `visituuid`.
export const visitAttribute = sqliteTable('tbl_visit_attribute', {
  uuid: text('uuid').primaryKey(),
  visit_uuid: text('visit_uuid'),
  value: text('value'),
  visit_attribute_type_uuid: text('visit_attribute_type_uuid'),
  voided: integer('voided').notNull().default(0),
  sync: integer('sync', { mode: 'boolean' }).notNull().default(false),
}, (table) => [
  index('idx_tbl_visit_attribute_visit_uuid').on(table.visit_uuid),
  index('idx_tbl_visit_attribute_sync').on(table.sync),
]);
