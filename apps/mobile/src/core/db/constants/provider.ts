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

/**
 * The OpenMRS encounter role attached to the provider on the push body
 * (`encounterProviders[].encounterRole`). NOT an encounter type — it never
 * appears in `encounter_type_uuid`, so it is deliberately not seeded into
 * `tbl_uuid_dictionary`. Lived in `constants/encounter.ts` until 2026-10-12.
 */
export const PROVIDER_ENCOUNTER_ROLE = '73bbb069-9781-4afc-a9d1-54b6b2270e04';

/**
 * Declared by the legacy but never referenced — not even as literals. Kept
 * because they are the doctor-side counterparts of PROVIDER_ENCOUNTER_ROLE and
 * the push seam may need them. Like it, neither is an encounter type, so
 * neither is seeded.
 */
export const PROVIDER_ENCOUNTER_ROLE_DOCTOR = '73bbb069-9781-4afc-a9d1-54b6b2270e03';
export const PROVIDER_DOCTOR_SLOT = 'f2f9948e-50e2-434e-8bf1-00a7426d6cc8';
