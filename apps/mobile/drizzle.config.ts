import type { Config } from 'drizzle-kit';

/**
 * Offline app: run `npx drizzle-kit generate` only. Migrations are generated to
 * ./drizzle, bundled into the app, and applied on-device via `useMigrations`.
 * Never `migrate`/`push` — there is no remote database.
 */
export default {
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/core/db/schema.ts',
  out: './drizzle',
} satisfies Config;
