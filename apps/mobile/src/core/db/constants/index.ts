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
 * `literals.ts` and `patient.ts` are the two exceptions to the uuid rule.
 * `literals.ts` holds column values that are not uuids, such as provider roles
 * and ward names. `patient.ts` holds the four patient-attribute type NAMES the
 * registration write looks up — the uuids behind them still come from the pull,
 * exactly as this file's note above says, so the exception is to the file's
 * contents and not to that rule. Both are excluded from the uuid sweep in
 * `__tests__/constants.test.ts` and each has its own guard there instead.
 */

export * as obsConcepts from './obs';
export * as encounterTypes from './encounter';
export * as visitAttributes from './visit';
export * as providerAttributes from './provider';
export * as dbLiterals from './literals';
export * as patientAttributeNames from './patient';
