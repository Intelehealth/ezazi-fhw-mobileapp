import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Captured images and call logs. Attached to the clinical tree but not part of it.

export const imageRecords = sqliteTable('tbl_image_records', {
  uuid: text('uuid').primaryKey(),
  patientuuid: text('patientuuid'),
  visituuid: text('visituuid'),
  encounteruuid: text('encounteruuid'),
  image_path: text('image_path'),
  obs_time_date: text('obs_time_date'),
  image_type: text('image_type'),
  voided: integer('voided').notNull().default(0),
  sync: integer('sync', { mode: 'boolean' }).notNull().default(false),
}, (table) => [
  index('idx_tbl_image_records_patientuuid').on(table.patientuuid),
  index('idx_tbl_image_records_visituuid').on(table.visituuid),
  index('idx_tbl_image_records_encounteruuid').on(table.encounteruuid),
  index('idx_tbl_image_records_sync').on(table.sync),
]);

export const rtcConnectionLog = sqliteTable('tbl_rtc_connection_log', {
  uuid: text('uuid').primaryKey(),
  visit_uuid: text('visit_uuid'),
  connection_info: text('connection_info'),
}, (table) => [
  index('idx_tbl_rtc_connection_log_visit_uuid').on(table.visit_uuid),
]);
