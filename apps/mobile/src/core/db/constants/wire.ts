/**
 * Constants the PUSH payload carries that are not ours — OpenMRS identifiers
 * the server matches on. They live here because `.eslintrc.cjs` allows a raw
 * uuid only under `constants/`, and because a transposed character here would
 * typecheck clean and fail silently on the server.
 */

/** Every pushed patient identifier is typed as this. `PatientsFrameJson.java:120`. */
export const OPENMRS_IDENTIFIER_TYPE = '05a29f94-c0ed-11e2-94be-8c13b969e334';

// The encounter-provider role the push sends is PROVIDER_ENCOUNTER_ROLE, in
// `constants/provider.ts`. It is not repeated here: the same uuid under two
// names is exactly what the constants guard exists to catch.
