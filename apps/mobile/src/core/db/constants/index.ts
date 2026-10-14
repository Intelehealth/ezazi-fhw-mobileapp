/**
 * OpenMRS uuids, ported verbatim from the legacy app's `UuidDictionary.java`.
 * ONE FILE PER ENTITY, mirroring `schema/` and `repositories/`, and the single
 * source for every uuid this app writes or matches.
 *
 * `encounter.ts` also carries the NAME of every encounter type. It replaced
 * `tbl_uuid_dictionary`, which held that mapping in the database and was
 * dropped on 2026-10-12 — see ROADMAP D17. Patient attribute types are not
 * here at all: the server sends the whole master list on every pull.
 *
 * `literals.ts` is the exception to the uuid rule: it holds column values that
 * are not uuids, such as provider roles and ward names.
 */

export * as obsConcepts from './obs';
export * as encounterTypes from './encounter';
export * as visitAttributes from './visit';
export * as providerAttributes from './provider';
export * as dbLiterals from './literals';
