import { and, eq, getTableColumns, sql } from 'drizzle-orm';

import { PROVIDER_ROLE_DOCTOR, PROVIDER_ROLE_NURSE, type Ward } from '../constants/literals';
import { FACILITY, PROVIDER_WARD } from '../constants/provider';
import { encounter, provider, providerAttribute, visit } from '../schema';
import type { Provider } from '../schema';
import { SYNC_CLEAN, VOIDED_NO } from '../syncFlags';
import type { DbHandle } from '../tx';

/**
 * `tbl_provider`, joined to `tbl_provider_attribute` for ward and facility.
 * PULL-ONLY: there is no dirty-flag read and no push path anywhere in the
 * legacy, so every write here lands clean. Synchronous, `on` last — see `tx.ts`.
 * Attribute rows are the `providerAttribute` repository's; this file only reads them.
 */

export type NewProvider = typeof provider.$inferInsert;

/** Name columns only. Callers format the label — and decide any fallback. */
export type ProviderName = Pick<Provider, 'given_name' | 'family_name'>;

export type EncounterAuthor = Pick<Provider, 'uuid' | 'given_name' | 'family_name'>;

/** The six columns the legacy's own DTO carried. Excludes `voided` and `sync`. */
export type ProviderSummary = Pick<
  Provider,
  'uuid' | 'identifier' | 'given_name' | 'family_name' | 'role' | 'useruuid'
>;

const summaryColumns = {
  uuid: provider.uuid,
  identifier: provider.identifier,
  given_name: provider.given_name,
  family_name: provider.family_name,
  role: provider.role,
  useruuid: provider.useruuid,
};

const nameColumns = { given_name: provider.given_name, family_name: provider.family_name };

/**
 * Insertion order for `tbl_provider_attribute`, which has no timestamp and no
 * sequence column. SQLite's implicit rowid is the only proxy, and it survives
 * our `onConflictDoUpdate` (an UPDATE) where it would not survive a REPLACE.
 * An explicit ordering column would be sturdier but needs a migration.
 */
const latestFirst = sql`rowid desc`;

// ── writes ────────────────────────────────────────────────────────────────

/**
 * Pull-path bulk write — the only write this table has. Keeps the server's
 * `modified_date`: the legacy overwrote it with the device clock, which poisons
 * any delta-sync that compares the two.
 */
export function upsertMany(rows: NewProvider[], on: DbHandle): void {
  for (const row of rows) {
    const values = { ...row, sync: SYNC_CLEAN };
    on.insert(provider)
      .values(values)
      .onConflictDoUpdate({ target: provider.uuid, set: values })
      .run();
  }
}

// ── reads ─────────────────────────────────────────────────────────────────

/**
 * Providers who authored at least one encounter on an existing visit.
 * ONE method where the legacy had two, each running the same ORDER BY-less
 * query and zipping the results by index — two executions, no guaranteed
 * row order. Ordering is explicit here so the pairing cannot come apart.
 */
export function listEncounterAuthors(on: DbHandle): EncounterAuthor[] {
  return on
    .selectDistinct({
      uuid: provider.uuid,
      given_name: provider.given_name,
      family_name: provider.family_name,
    })
    .from(provider)
    .innerJoin(encounter, eq(encounter.provider_uuid, provider.uuid))
    .innerJoin(visit, eq(visit.uuid, encounter.visituuid))
    .orderBy(provider.given_name, provider.family_name)
    .all();
}

/**
 * Returns null on a miss. The legacy returned the literal 'Test Doctor', which
 * ships to users as a real clinician name — the fallback is the caller's call.
 */
export function findNameByUuid(uuid: string, on: DbHandle): ProviderName | null {
  return on.select(nameColumns).from(provider).where(eq(provider.uuid, uuid)).limit(1).get() ?? null;
}

/**
 * Keyed on `useruuid`, which is NOT unique — the legacy scanned every match and
 * kept the last. This takes the first and caps at one row. See `findNameByUuid`
 * for the 'Test Doctor' fallback that is deliberately not reproduced.
 */
export function findNameByUserUuid(userUuid: string, on: DbHandle): ProviderName | null {
  return (
    on.select(nameColumns).from(provider).where(eq(provider.useruuid, userUuid)).limit(1).get() ??
    null
  );
}

export function findUserUuidByProviderUuid(providerUuid: string, on: DbHandle): string | null {
  const row = on
    .select({ useruuid: provider.useruuid })
    .from(provider)
    .where(eq(provider.uuid, providerUuid))
    .limit(1)
    .get();

  return row?.useruuid ?? null;
}

/**
 * The provider's ward. FIXED, not ported: the legacy filtered on neither
 * `attributetypeuuid` nor `voided` and kept the last row, so a provider holding
 * both a ward and a facility attribute could get the FACILITY UUID back as
 * their ward — which then silently fell through to the unfiltered nurse list.
 */
export function findWardForProvider(providerUuid: string, on: DbHandle): string | null {
  const row = on
    .select({ value: providerAttribute.value })
    .from(providerAttribute)
    .where(
      and(
        eq(providerAttribute.provideruuid, providerUuid),
        eq(providerAttribute.attributetypeuuid, PROVIDER_WARD),
        eq(providerAttribute.voided, VOIDED_NO),
      ),
    )
    .orderBy(latestFirst)
    .limit(1)
    .get();

  return row?.value ?? null;
}

/**
 * Doctors at one facility, for the primary/secondary doctor pickers.
 * DISTINCT and the voided filter are both added: the legacy had neither, so a
 * provider with two FACILITY rows for the same location appeared twice.
 */
export function listDoctorsAtFacility(
  facilityLocationUuid: string,
  on: DbHandle,
): ProviderSummary[] {
  return on
    .selectDistinct(summaryColumns)
    .from(provider)
    .innerJoin(providerAttribute, eq(providerAttribute.provideruuid, provider.uuid))
    .where(
      and(
        eq(provider.role, PROVIDER_ROLE_DOCTOR),
        eq(providerAttribute.attributetypeuuid, FACILITY),
        eq(providerAttribute.value, facilityLocationUuid),
        eq(providerAttribute.voided, VOIDED_NO),
      ),
    )
    .orderBy(provider.given_name, provider.family_name)
    .all();
}

/**
 * Nurses at a facility, optionally excluding one ward. Raw SQL because each
 * attribute joins through a latest-row-per-provider subquery.
 *
 * TWO DELIBERATE CHANGES. The ward/`isFromHome` branching was business logic
 * reading session globals inside the DAO; it collapses to `excludeWard`, which
 * the caller resolves. And the facility filter ALWAYS applies — the legacy's
 * fallback branch dropped both filters and returned every nurse in the database.
 */
export function listNursesForWard(
  input: { facilityLocationUuid: string; excludeWard: Ward | null },
  on: DbHandle,
): ProviderSummary[] {
  const excluded = input.excludeWard;

  return on.all<ProviderSummary>(sql`
    SELECT p.uuid, p.identifier, p.given_name, p.family_name, p.role, p.useruuid
    FROM tbl_provider p
    LEFT JOIN (
      SELECT pa.provideruuid, pa.value
      FROM tbl_provider_attribute pa
      INNER JOIN (
        SELECT provideruuid, max(rowid) AS latest_row
        FROM tbl_provider_attribute
        WHERE voided = ${VOIDED_NO} AND attributetypeuuid = ${PROVIDER_WARD}
        GROUP BY provideruuid
      ) latest_ward
        ON pa.provideruuid = latest_ward.provideruuid AND pa.rowid = latest_ward.latest_row
    ) ward ON ward.provideruuid = p.uuid
    LEFT JOIN (
      SELECT fac.provideruuid, fac.value
      FROM tbl_provider_attribute fac
      INNER JOIN (
        SELECT provideruuid, max(rowid) AS latest_row
        FROM tbl_provider_attribute
        WHERE voided = ${VOIDED_NO} AND attributetypeuuid = ${FACILITY}
        GROUP BY provideruuid
      ) latest_fac
        ON fac.provideruuid = latest_fac.provideruuid AND fac.rowid = latest_fac.latest_row
    ) facility ON facility.provideruuid = p.uuid
    WHERE p.role = ${PROVIDER_ROLE_NURSE}
      AND facility.value = ${input.facilityLocationUuid}
      AND (${excluded} IS NULL OR ward.value IS NULL OR ward.value != ${excluded})
    ORDER BY p.given_name, p.family_name
  `);
}

/** Every column, for the pull path and for tests. Ordered, unlike the legacy. */
export function findAll(on: DbHandle): Provider[] {
  return on
    .select(getTableColumns(provider))
    .from(provider)
    .orderBy(provider.given_name, provider.family_name)
    .all();
}
