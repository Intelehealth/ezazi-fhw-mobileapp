import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Lookup data, not clinical records. `tbl_location` is write-only — pull fills it, nothing reads it.

export const location = sqliteTable('tbl_location', {
  name: text('name'),
  locationuuid: text('locationuuid').primaryKey(),
  retired: integer('retired'),
  modified_date: text('modified_date'),
  voided: integer('voided').notNull().default(0),
  sync: integer('sync', { mode: 'boolean' }).notNull().default(false),
}, (table) => [
  index('idx_tbl_location_sync').on(table.sync),
]);

// Staged for removal — resolve types by uuid constant. See ROADMAP "Staged removal".
export const uuidDictionary = sqliteTable('tbl_uuid_dictionary', {
  uuid: text('uuid').primaryKey(),
  name: text('name'),
});
