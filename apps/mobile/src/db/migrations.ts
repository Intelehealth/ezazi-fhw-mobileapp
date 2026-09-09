import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

// v1 is the initial schema — no migration steps needed.
// Add migration blocks here when the schema version is bumped.
export const migrations = schemaMigrations({ migrations: [] });
