/**
 * Provider attribute type uuids — written to
 * `tbl_provider_attribute.attributetypeuuid`, except the speciality type below,
 * which routes a row to `tbl_dr_speciality` instead. The first two come from
 * the legacy `UuidDictionary.java`; the third never did.
 */

// The two attributes the ward filter reads to decide which patients a provider sees.
export const PROVIDER_WARD = 'af56439d-5e7f-42e7-9249-6a894b07eb51';
export const FACILITY = '28451dd4-2fdb-4b96-a5bd-a330f4c68575';

/**
 * Doctor speciality. The one routing uuid the legacy never put in its
 * dictionary — it sat inline in `ProviderAttributeLIstDAO.java:61` and `:92`.
 */
export const PROVIDER_SPECIALITY = 'ed1715f5-93e2-404e-b3c9-2a2d9600f062';
