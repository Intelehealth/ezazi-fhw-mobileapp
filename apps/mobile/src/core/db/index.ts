import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { schema } from './schema';

/**
 * Local offline store (replaces the WatermelonDB `localrecords` database).
 * `enableChangeListener: true` is REQUIRED — Drizzle's `useLiveQuery` reactivity
 * depends on expo-sqlite's change listener. Reactive reads outside React (the
 * sync engine, stores) should use `addDatabaseChangeListener`, not `useLiveQuery`.
 */
const expoDb = openDatabaseSync('localrecords.db', { enableChangeListener: true });

export const db = drizzle(expoDb, { schema });
export { schema };
