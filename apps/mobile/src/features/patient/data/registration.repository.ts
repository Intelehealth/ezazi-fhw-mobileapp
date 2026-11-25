import { clientConfig } from '@/core/config/clients';
import { patientAttributeNames } from '@/core/db/constants';
import type { PatientInput } from '@/core/db/repositories/patient';
import type { DbHandle } from '@/core/db/tx';
import { useAuthStore } from '@/core/session/auth.store';
import { patientWrites } from '@/core/useCases';
import type { NamedAttribute } from '@/core/useCases/patientWrites';
import { localIsoTimestamp } from '@/core/utils/datetime';

import { encodeCityVillage } from '../domain/addressMaster';
import type {
  AddressDraft,
  PersonalDraft,
  RegistrationMode,
} from '../stores/registrationDraft.store';

/**
 * The write seam for patient registration — the one place that decides which
 * column each field becomes.
 *
 * WHY THE TYPES COME FROM THE STORE, with `import type`. The draft store is
 * the one definition of what a registration IS, and the store is also this
 * file's only caller — a screen importing `features/*\/data` fails
 * `npm run lint`, so the chain is screen -> store -> repository. A value import
 * back to the store would be a cycle; `import type` is erased at compile time,
 * so nothing circular is emitted.
 */

/**
 * The draft as it stood when Save was tapped, with the nulls already resolved.
 *
 * `personal` and `address` are non-null here where they are nullable in the
 * store: the store checks both before it calls, so this file never has to ask
 * "was step 1 actually filled in". `patientUuid` is non-null for the same
 * reason — it is minted on entry to the flow, and the photo on disk is already
 * named after it. `startedAt` stays nullable: it is only ever WRITTEN on the
 * create path, so a null on an edit is not a missing value.
 */
export interface RegistrationSnapshot {
  mode: RegistrationMode;
  patientUuid: string;
  startedAt: string | null;
  personal: PersonalDraft;
  address: AddressDraft;
}

/** The legacy's registration-number parts: the first two characters, or ''. */
function firstTwo(value: string): string {
  return value.trim().slice(0, 2);
}

/**
 * `country[0:2]/state[0:2]/cityVillage[0:2]/<random>`, ported as-is.
 *
 * Carried verbatim on Arpan's call (2026-11-25) including the random number:
 * the server receives this attribute today, so changing its shape changes what
 * something outside these two apps may be reading. It has no uniqueness check
 * in the legacy either — `openmrs_id`, which the server mints, is the real
 * identifier.
 */
function registrationNumber(country: string, state: string, cityVillage: string): string {
  const random = Math.floor(Math.random() * (99999999 - 100 + 1)) + 100;
  return `${firstTwo(country)}/${firstTwo(state)}/${firstTwo(cityVillage)}/${String(random)}`;
}

/**
 * Which of the four attributes this save writes.
 *
 * Two are create-only, exactly as the legacy has it: the registration number
 * is not re-minted on an edit, so it stays stable for the life of the patient,
 * and the start time belongs to the registration that created the row. The
 * other two are written on both paths.
 *
 * `AlternateNo` is SKIPPED when the field was left blank rather than written
 * empty — an empty attribute row is a row that resolves to nothing on
 * read-back and ships an empty value on push.
 */
function attributesFor(
  snapshot: RegistrationSnapshot,
  country: string,
  cityVillage: string,
): NamedAttribute[] {
  const attributes: NamedAttribute[] = [];
  const { personal, address, mode, startedAt } = snapshot;

  if (personal.alternateMobileNumber.trim() !== '') {
    attributes.push({
      name: patientAttributeNames.ATTR_ALTERNATE_NUMBER,
      value: personal.alternateMobileNumber,
    });
  }

  // The legacy writes this unconditionally, even with no photo — it is the
  // save time, not the photo time. Ported as-is.
  attributes.push({
    name: patientAttributeNames.ATTR_PROFILE_IMAGE_TIMESTAMP,
    value: localIsoTimestamp(),
  });

  if (mode === 'create') {
    attributes.push({
      name: patientAttributeNames.ATTR_REGISTRATION_NUMBER,
      value: registrationNumber(country, address.state, cityVillage),
    });

    if (startedAt !== null) {
      attributes.push({
        name: patientAttributeNames.ATTR_REGISTRATION_START,
        value: startedAt,
      });
    }
  }

  return attributes;
}

/**
 * Writes the patient row, its attributes and its profile-image record, and
 * resolves when they exist.
 *
 * REJECTS rather than returning a result. The store turns a rejection into its
 * own `{ ok: false }` union so the screen never has to catch — see
 * `submitRegistration`. A failed `transact()` propagates from here unchanged.
 *
 * `async`, so the failure arrives as a rejected promise rather than a
 * synchronous throw. The two are not the same thing at a call site that does
 * not `await` inside its `try`, and the store's contract depends on it.
 *
 * `on` is for tests: without it `transact` falls through to `getDb()`, which
 * opens expo-sqlite and cannot load under Node. The store calls this with one
 * argument, so the parameter is additive.
 */
export async function saveRegistration(
  snapshot: RegistrationSnapshot,
  on?: DbHandle,
): Promise<void> {
  const { personal, address, patientUuid } = snapshot;

  // Never from a widget. The country field on the address screen is inert and
  // renders this same value — the legacy kept a translated string on screen
  // and an untranslated one in the column, and they could drift.
  const country = clientConfig.countryName;

  // The one encoding: there is no district column, so a state WITH districts
  // stores "District:Village" and anything else stores the bare village.
  const cityVillage = encodeCityVillage(address.state, address.district, address.village);

  const patient: PatientInput = {
    openmrs_id: null,
    first_name: personal.firstName.trim(),
    middle_name: personal.middleName.trim(),
    last_name: personal.lastName.trim(),
    date_of_birth: personal.dateOfBirth,
    phone_number: personal.mobileNumber,
    address1: address.addressLine1.trim(),
    address2: address.addressLine2.trim(),
    city_village: cityVillage,
    state_province: address.state,
    postal_code: address.postalCode,
    country,
    // gender is NOT passed: createPatient hardcodes 'F' as a write-side
    // constant of this path, with a test pinning it.
    sdw: null,
    creatoruuid: useAuthStore.getState().userUuid,
    occupation: null,
    patient_photo: personal.photoPath,
    economic_status: null,
    education_status: null,
    caste: null,
    dead: '0',
    // Local, matching modified_date, which createPatient stamps itself. The
    // legacy used UTC here; two timestamps in one row disagreeing is worse
    // than matching the legacy on a column nothing reads back as a clock.
    dateCreated: localIsoTimestamp(),
  };

  patientWrites.createPatientWithAttributes(
    {
      patientUuid,
      patient,
      attributes: attributesFor(snapshot, country, cityVillage),
      photoPath: personal.photoPath,
    },
    on,
  );
}
