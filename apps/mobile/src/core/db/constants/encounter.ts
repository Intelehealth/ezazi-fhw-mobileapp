/**
 * Encounter type uuids — every value here is written to or matched against
 * `tbl_encounter.encounter_type_uuid`. Ported verbatim from the legacy
 * `UuidDictionary.java`. Several sat among concepts there despite being matched
 * on encounter_type_uuid; they are grouped by real usage here. Concepts: `obs.ts`.
 */

// The clinical encounters a visit is made of.
export const ENCOUNTER_ADULTINITIAL = '8d5b27bc-c2cc-11de-8d13-0010c6dffd0f';
export const ENCOUNTER_VITALS = '67a71486-1a54-468f-ac3e-7091a9a79584';
export const ENCOUNTER_VISIT_NOTE = 'd7151f82-c1f3-4152-a605-2f9ea7414a79';

// Bookkeeping encounters. Excluded from "the latest real clinical encounter".
export const ENCOUNTER_VISIT_COMPLETE = 'bd1fbfaa-f5fb-4ebd-b75c-564506fc309e';
export const ENCOUNTER_PATIENT_EXIT_SURVEY = '629a9d0b-48eb-405e-953d-a5964c88dc30';
export const ENCOUNTER_ADMISSION = 'e22e39fd-7db2-45e7-80f1-60fa0d5a4378';
export const LCG_SOS = '6ce3e2eb-35d4-4aa2-aa77-6d1d3b3f524a';

// Labour-stage markers. Filed among concepts in the Java, matched on encounter_type_uuid.
export const STAGE1_HOUR1_1 = 'ee560d18-34a1-4ad8-87c8-98aed99c663d';
export const STAGE3_HOUR1_1 = 'e58b22d1-b09e-4cda-b05c-a45d1e63d390';
export const DELIVERY_OUTCOME_STAGE3 = 'c5f95c0f-a499-4792-9ee0-ff138d8df425';

/**
 * Excluded when asking for the latest real clinical encounter on a visit.
 * Legacy inlines these three as literals in two different queries; keep one list.
 */
export const NON_CLINICAL_ENCOUNTER_TYPES = [
  ENCOUNTER_VISIT_COMPLETE,
  ENCOUNTER_ADMISSION,
  LCG_SOS,
] as const;
