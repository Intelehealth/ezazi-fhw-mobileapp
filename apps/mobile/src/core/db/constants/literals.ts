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
