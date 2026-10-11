/**
 * Visit type uuids and visit attribute type uuids. The latter are written to
 * `tbl_visit_attribute.visit_attribute_type_uuid`. Ported verbatim from the
 * legacy `UuidDictionary.java`; VISIT_RISK and DECISION_PENDING sat among
 * concepts there despite being visit attributes.
 */

// There is one visit type.
export const VISIT_TELEMEDICINE = 'a86ac96e-2e07-47a7-8e72-8216a1a75bfd';

// Routing and ownership. VISIT_HOLDER is the authority on who owns a visit —
// `tbl_visit.creator` is immutable, so a shift handover updates this attribute.
export const VISIT_HOLDER = 'a0378be4-d9c6-4cb2-bbf5-777e27a32efc';
export const VISIT_DR_SPECIALITY = '3f296939-c6d3-4d2e-b8ca-d7f4bfd42c2d';
export const VISIT_READ_STATUS = '2e4b62a5-aa71-43e2-abc9-f4a777697b19';

// Derived state written back onto the visit.
export const VISIT_RISK = '0e798578-96c1-450b-9927-52e45485b151';
export const DECISION_PENDING = '2bfbfd6c-7714-4432-a7e8-b0130889c2ff';
