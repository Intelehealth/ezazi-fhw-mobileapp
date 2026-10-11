/**
 * `tbl_provider.role` values. The only file under `constants/` that holds
 * something other than uuids, so the uuid sweep in `constants.test.ts` skips
 * it — a uuid added here would escape that guard. Keep uuids out.
 */

/**
 * Matched in four legacy SQL strings: the obs read that excludes
 * doctor-authored rows, the provider list, and both prescription joins.
 */
export const PROVIDER_ROLE_DOCTOR = 'Organizational: Doctor';
