/**
 * OpenMRS uuids, ported verbatim from the legacy app's `UuidDictionary.java`.
 * Resolve types by these constants, never by a name lookup in
 * `tbl_uuid_dictionary` — that table is seeded on create only and is staged for
 * removal. One file per entity, mirroring `schema/` and `repositories/`.
 */

export * as obsConcepts from './obs';
export * as encounterTypes from './encounter';
export * as patientAttributes from './patient';
export * as visitAttributes from './visit';
export * as providerAttributes from './provider';
