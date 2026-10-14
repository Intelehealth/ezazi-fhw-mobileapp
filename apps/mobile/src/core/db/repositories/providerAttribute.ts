import { and, eq, sql } from 'drizzle-orm';

import { PROVIDER_SPECIALITY } from '../constants/provider';
import { drSpeciality, providerAttribute } from '../schema';
import type { DrSpeciality, ProviderAttribute } from '../schema';
import { VOIDED_NO } from '../syncFlags';
import type { DbHandle } from '../tx';

/**
 * `tbl_provider_attribute` AND `tbl_dr_speciality`. Both live here because the
 * pull sends them down one list and the attribute type decides which table a
 * row lands in — but they are never written by one shared function, because
 * they do not behave alike (see `upsertSpeciality`).
 * PULL-ONLY, like `provider`: no local writes, no dirty flag, no push path.
 */

export type NewProviderAttribute = typeof providerAttribute.$inferInsert;
export type NewDrSpeciality = typeof drSpeciality.$inferInsert;

/** One row of the pull's provider-attribute list, before routing. */
export type PulledProviderAttribute = {
  uuid: string;
  provideruuid: string;
  attributetypeuuid: string;
  value: string | null;
  voided: number;
};

/** Insertion order. `tbl_provider_attribute` has no timestamp — see `provider.ts`. */
const latestFirst = sql`rowid desc`;

/** The legacy compared this uuid with `equalsIgnoreCase`; keep that. */
const isSpeciality = (typeUuid: string) =>
  typeUuid.toLowerCase() === PROVIDER_SPECIALITY.toLowerCase();

// ── writes ────────────────────────────────────────────────────────────────

export function upsertProviderAttribute(row: NewProviderAttribute, on: DbHandle): void {
  on.insert(providerAttribute)
    .values(row)
    .onConflictDoUpdate({ target: providerAttribute.uuid, set: row })
    .run();
}

/**
 * Separate from `upsertProviderAttribute` on purpose. The legacy declared
 * `tbl_dr_speciality.value TEXT UNIQUE` and wrote with REPLACE, so storing a
 * second provider whose speciality string matched an existing one DELETED the
 * first provider's row — the table was a deduplicated list of names wearing a
 * `provideruuid` column. Our schema has no such UNIQUE, so rows coexist.
 */
export function upsertSpeciality(row: NewDrSpeciality, on: DbHandle): void {
  on.insert(drSpeciality)
    .values(row)
    .onConflictDoUpdate({ target: drSpeciality.uuid, set: row })
    .run();
}

/**
 * Pull-path bulk write. Routes each row by attribute type: speciality to
 * `tbl_dr_speciality`, everything else to `tbl_provider_attribute`.
 *
 * TWO DEPARTURES FROM LEGACY, both fixing silent data loss.
 * It wrote a row ONLY when `voided == 0`, so a ward or facility the server had
 * revoked was never updated and the stale local row survived every later pull,
 * forever. We write the row with its `voided` flag instead; the reads in
 * `provider.ts` filter on it, so a revocation now takes effect. No hard delete.
 * And it accepted only three attribute types, discarding any other with no
 * `else` and no log. We route by speciality and keep the rest — an unread row
 * is harmless, a silently dropped one is not.
 */
export function upsertManyFromPull(rows: PulledProviderAttribute[], on: DbHandle): void {
  for (const row of rows) {
    if (isSpeciality(row.attributetypeuuid)) {
      upsertSpeciality(row, on);
    } else {
      upsertProviderAttribute(row, on);
    }
  }
}

// ── reads ─────────────────────────────────────────────────────────────────

/** Live attribute rows for one provider, newest first. */
export function listByProvider(providerUuid: string, on: DbHandle): ProviderAttribute[] {
  return on
    .select()
    .from(providerAttribute)
    .where(
      and(
        eq(providerAttribute.provideruuid, providerUuid),
        eq(providerAttribute.voided, VOIDED_NO),
      ),
    )
    .orderBy(latestFirst)
    .all();
}

/**
 * The newest live value of one attribute type. `provider.ts` has a named
 * wrapper over this shape for the ward, which is the only hot caller.
 */
export function findValue(
  providerUuid: string,
  attributeTypeUuid: string,
  on: DbHandle,
): string | null {
  const row = on
    .select({ value: providerAttribute.value })
    .from(providerAttribute)
    .where(
      and(
        eq(providerAttribute.provideruuid, providerUuid),
        eq(providerAttribute.attributetypeuuid, attributeTypeUuid),
        eq(providerAttribute.voided, VOIDED_NO),
      ),
    )
    .orderBy(latestFirst)
    .limit(1)
    .get();

  return row?.value ?? null;
}

/** The one speciality read with a live caller — an existence check on the name. */
export function specialityExists(value: string, on: DbHandle): boolean {
  const row = on
    .select({ uuid: drSpeciality.uuid })
    .from(drSpeciality)
    .where(and(eq(drSpeciality.value, value), eq(drSpeciality.voided, VOIDED_NO)))
    .limit(1)
    .get();

  return row !== undefined;
}

/** Live specialities for one provider, A-Z. The legacy had no ordering at all. */
export function listSpecialitiesByProvider(
  providerUuid: string,
  on: DbHandle,
): DrSpeciality[] {
  return on
    .select()
    .from(drSpeciality)
    .where(
      and(eq(drSpeciality.provideruuid, providerUuid), eq(drSpeciality.voided, VOIDED_NO)),
    )
    .orderBy(drSpeciality.value)
    .all();
}
