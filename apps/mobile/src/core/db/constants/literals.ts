/**
 * Free-text column values OpenMRS queries match on exactly. The only file under
 * `constants/` that holds something other than uuids, so the uuid sweep in
 * `constants.test.ts` skips it — a uuid added here would escape that guard.
 * Keep uuids out.
 */

// `tbl_provider.role`. The colon-space is part of the stored value.
export const PROVIDER_ROLE_DOCTOR = 'Organizational: Doctor';
export const PROVIDER_ROLE_NURSE = 'Organizational: Nurse';

/**
 * `tbl_provider_attribute.value` where the type is PROVIDER_WARD. Two words in
 * the data; the legacy also spells it 'Postnatal Ward' in comments. Match the data.
 */
export const WARD_LABOR = 'Labor Ward';
export const WARD_POST_NATAL = 'Post Natal Ward';

export type Ward = typeof WARD_LABOR | typeof WARD_POST_NATAL;

/**
 * `tbl_visit_attribute.value` for VISIT_READ_STATUS. Written BOTH when a visit
 * is created and when it is marked read, so it does not distinguish the two
 * states — what they actually are is not inferable from the legacy. Ported
 * verbatim; do not invent a boolean here. See ROADMAP "read status".
 */
export const VISIT_READ_STATUS_VALUE = '$';

/** `tbl_visit_attribute.value` for VISIT_DR_SPECIALITY on a new visit (Android `AppConstants.OBSTETRICIAN_GYNECOLOGIST`). */
export const VISIT_SPECIALITY_OBGYN = 'Obstetrician & Gynecologist';

/** `tbl_obs.value` of the MISSED_ENCOUNTER marker, as Android's `checkObsAndCreateMissedObs` writes it. */
export const MISSED_ENCOUNTER_VALUE = '-';

/**
 * `tbl_image_records.image_type`. The only value the legacy ever wrote or
 * filtered on — the table holds patient profile pictures and nothing else.
 */
export const IMAGE_TYPE_PROFILE = 'PP';
