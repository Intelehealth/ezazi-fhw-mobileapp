/**
 * Every repository, namespaced. A flat `export *` is not an option: eight
 * names are shared across files — four `findAll`s, plus `upsertMany`,
 * `upsertManyFromPull`, `upsertManyFromServer`, `markSynced`, `markDirty`,
 * `findValue` and `findDirty` twice each. The `Repo` suffix also keeps these
 * distinct from the schema tables, which share their bare names.
 *
 * Every function is synchronous and takes its `DbHandle` as the LAST and
 * REQUIRED argument, so it runs standalone or joins a caller's `transact`.
 * See `tx.ts` and `DB_CONVENTIONS.md` §1.
 */

export * as encounterRepo from './encounter';
export * as imageRepo from './image';
export * as locationRepo from './location';
export * as obsRepo from './obs';
export * as patientRepo from './patient';
export * as providerRepo from './provider';
export * as providerAttributeRepo from './providerAttribute';
export * as rtcConnectionRepo from './rtcConnection';
export * as visitRepo from './visit';
export * as visitAttributeRepo from './visitAttribute';
