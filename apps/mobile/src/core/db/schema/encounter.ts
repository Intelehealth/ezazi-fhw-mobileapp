import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Encounters and their observations — the leaves of the clinical tree.

export const encounter = sqliteTable('tbl_encounter', {
  uuid: text('uuid').primaryKey(),
  visituuid: text('visituuid'),
  encounter_time: text('encounter_time'),
  provider_uuid: text('provider_uuid'),
  encounter_type_uuid: text('encounter_type_uuid'),
  modified_date: text('modified_date'),
  sync: integer('sync', { mode: 'boolean' }).notNull().default(false),
  voided: integer('voided').notNull().default(0),
  privacynotice_value: text('privacynotice_value'),
}, (table) => [
  index('idx_tbl_encounter_visituuid').on(table.visituuid),
  index('idx_tbl_encounter_sync').on(table.sync),
]);

// `comment` is an alert flag ('R', 'Y', ''), not a note — it feeds the risk score.
export const obs = sqliteTable('tbl_obs', {
  uuid: text('uuid').primaryKey(),
  encounteruuid: text('encounteruuid'),
  conceptuuid: text('conceptuuid'),
  value: text('value'),
  comment: text('comment'),
  creator: text('creator'),
  creatoruuid: text('creatoruuid'),
  voided: integer('voided').notNull().default(0),
  obsservermodifieddate: text('obsservermodifieddate'),
  modified_date: text('modified_date'),
  created_date: text('created_date'),
  sync: integer('sync', { mode: 'boolean' }).notNull().default(false),
}, (table) => [
  index('idx_tbl_obs_encounteruuid').on(table.encounteruuid),
  index('idx_tbl_obs_conceptuuid').on(table.conceptuuid),
  index('idx_tbl_obs_sync').on(table.sync),
]);
