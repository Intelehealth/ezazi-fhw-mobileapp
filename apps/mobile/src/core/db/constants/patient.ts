/**
 * Patient-attribute type NAMES, not uuids — which is why this file sits beside
 * `literals.ts` as the second exception to the uuid rule, and why the uuid
 * sweep in `constants.test.ts` must skip it too.
 *
 * `constants/index.ts` says attribute types are deliberately not kept here,
 * because the server sends the whole master list on every pull. That is still
 * true of the uuids: `tbl_patient_attribute.person_attribute_type_uuid` is
 * resolved at write time by `patientRepo.getAttributeTypeUuid(name)` against
 * `tbl_patient_attribute_master`, which only sync fills. What this file holds
 * is the four NAMES the registration write has to look up — spelled
 * character-for-character as the legacy spells them, because the lookup
 * matches on the name and a typo silently yields a null type uuid.
 *
 * `DB_CONVENTIONS.md` §3: these four are the only values that stay patient
 * attributes in this app. The fifteen obstetric values are obs under an
 * Admission encounter, not attributes.
 */

/** The alternate mobile number. Not a column on `tbl_patient`. */
export const ATTR_ALTERNATE_NUMBER = 'AlternateNo';

/** Stamped at save, unconditionally — it is the save time, not the photo time. */
export const ATTR_PROFILE_IMAGE_TIMESTAMP = 'ProfileImageTimestamp';

/**
 * The client-minted registration number. Carried as-is (Arpan, 2026-11-25),
 * random generator and all: the server receives this attribute today, and
 * something outside these two apps may read it even though neither does.
 */
export const ATTR_REGISTRATION_NUMBER = 'Ezazi Registration Number';

/**
 * When the registration began. The legacy stamps it on the Privacy Notice
 * screen, which this port skips, so here it is stamped on entry to the flow
 * instead — `startRegistration`, where the uuid is minted.
 */
export const ATTR_REGISTRATION_START = 'patientRegistrationStartDateTime';
