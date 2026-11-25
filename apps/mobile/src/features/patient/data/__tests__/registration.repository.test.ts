import { eq } from 'drizzle-orm';

import { clientConfig } from '@/core/config/clients';
import { createTestDb, type TestDb } from '@/core/db/__tests__/helpers/testDb';
import { patientAttributeNames } from '@/core/db/constants';
import { patientRepo } from '@/core/db/repositories';
import { imageRecords, patient, patientAttribute } from '@/core/db/schema';
import { SYNC_DIRTY } from '@/core/db/syncFlags';
import type { DbHandle } from '@/core/db/tx';
import { useAuthStore } from '@/core/session/auth.store';

import type {
  AddressDraft,
  PersonalDraft,
  RegistrationMode,
} from '../../stores/registrationDraft.store';
import { saveRegistration, type RegistrationSnapshot } from '../registration.repository';

/**
 * The registration write, end to end against a real SQLite engine.
 *
 * `createTestDb` builds an in-memory database from the SHIPPED `drizzle/`
 * journal, so this fails if the migrations ever drift from `schema.ts` — the
 * rows asserted below are the rows a device would get.
 *
 * It drives `saveRegistration` with the `on` handle rather than mocking
 * `core/db`: nothing here is stubbed between the draft and the row.
 */

// Raw uuid literals are banned under src/ by eslint's NO_RAW_UUID rule, which
// excludes src/**/__tests__/**.
const PATIENT_UUID = '6f3c1b2a-0d5e-4a87-9c11-2b7f8e4d6a30';
const PROVIDER_UUID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const STARTED_AT = '2026-11-25T09:15:00.000+0530';

const ATTRIBUTE_TYPES = [
  { uuid: 'type-alternate', name: patientAttributeNames.ATTR_ALTERNATE_NUMBER },
  { uuid: 'type-photo-ts', name: patientAttributeNames.ATTR_PROFILE_IMAGE_TIMESTAMP },
  { uuid: 'type-reg-no', name: patientAttributeNames.ATTR_REGISTRATION_NUMBER },
  { uuid: 'type-started', name: patientAttributeNames.ATTR_REGISTRATION_START },
];

const PHOTO_PATH = `file:///document/patient-photos/${PATIENT_UUID}.jpg`;

const BASE_PERSONAL: PersonalDraft = {
  firstName: 'Asha',
  middleName: '',
  lastName: 'Patil',
  dateOfBirth: '1998-04-28',
  age: '28',
  mobileNumber: '9876543210',
  alternateMobileNumber: '9123456780',
  photoPath: PHOTO_PATH,
};

const BASE_ADDRESS: AddressDraft = {
  state: 'Maharashtra',
  district: 'Pune',
  village: 'Sinnar',
  addressLine1: '12 Market Road',
  addressLine2: '',
  postalCode: '411038',
};

/** The two halves merge field-wise, so a test can change one and say so. */
function snapshot(
  overrides: {
    mode?: RegistrationMode;
    startedAt?: string | null;
    personal?: Partial<PersonalDraft>;
    address?: Partial<AddressDraft>;
  } = {},
): RegistrationSnapshot {
  return {
    mode: overrides.mode ?? 'create',
    patientUuid: PATIENT_UUID,
    startedAt: overrides.startedAt === undefined ? STARTED_AT : overrides.startedAt,
    personal: { ...BASE_PERSONAL, ...overrides.personal },
    address: { ...BASE_ADDRESS, ...overrides.address },
  };
}

describe('saveRegistration', () => {
  let ctx: TestDb;
  let db: DbHandle;

  const row = () => db.select().from(patient).where(eq(patient.uuid, PATIENT_UUID)).get();
  const attributes = () =>
    db.select().from(patientAttribute).where(eq(patientAttribute.patientuuid, PATIENT_UUID)).all();
  const valueOf = (name: string) => {
    const type = ATTRIBUTE_TYPES.find((t) => t.name === name);
    return attributes().find((a) => a.person_attribute_type_uuid === type?.uuid)?.value;
  };

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
    // The master table is filled only by the pull, and the type uuids are
    // resolved from it by NAME at write time. Without this every attribute
    // row would be skipped.
    patientRepo.upsertAttributeTypes(ATTRIBUTE_TYPES, db);
    useAuthStore.setState({ userUuid: PROVIDER_UUID });
  });

  afterEach(() => ctx.close());

  describe('the patient row', () => {
    it('writes one row under the uuid the draft already minted', async () => {
      await saveRegistration(snapshot(), db);

      // The same uuid the photo on disk is named after, and the one the push
      // will send. Nothing re-mints at save time.
      expect(row()?.uuid).toBe(PATIENT_UUID);
    });

    it('maps the personal half onto its columns', async () => {
      await saveRegistration(snapshot(), db);

      expect(row()).toMatchObject({
        first_name: 'Asha',
        middle_name: '',
        last_name: 'Patil',
        date_of_birth: '1998-04-28',
        phone_number: '9876543210',
      });
    });

    it('maps the address half, with country from config rather than the form', async () => {
      await saveRegistration(snapshot(), db);

      expect(row()).toMatchObject({
        address1: '12 Market Road',
        address2: '',
        state_province: 'Maharashtra',
        postal_code: '411038',
        country: clientConfig.countryName,
      });
    });

    it('folds district and village into city_village', async () => {
      await saveRegistration(snapshot(), db);

      // There is no district column. A state WITH districts stores the pair.
      expect(row()?.city_village).toBe('Pune:Sinnar');
    });

    it('stores the bare village when the state has no districts', async () => {
      await saveRegistration(snapshot({ address: { district: '' } }), db);

      expect(row()?.city_village).toBe('Sinnar');
    });

    it("writes gender 'F' without being asked, and age nowhere", async () => {
      await saveRegistration(snapshot(), db);

      // gender is a write-side constant of createPatient, not a form field;
      // age is derived and has no column at all.
      expect(row()?.gender).toBe('F');
      expect(Object.keys(row() ?? {})).not.toContain('age');
    });

    it('records the signed-in provider as the creator', async () => {
      await saveRegistration(snapshot(), db);

      expect(row()?.creatoruuid).toBe(PROVIDER_UUID);
    });

    it('is born needing send', async () => {
      await saveRegistration(snapshot(), db);

      // SYNC_DIRTY is false, inverted from intuition. The push walks unsent
      // parents, so a clean row here would never be collected.
      expect(row()?.sync).toBe(SYNC_DIRTY);
    });

    it('trims the names it was given', async () => {
      await saveRegistration(
        snapshot({ personal: { firstName: '  Asha  ', lastName: ' Patil ' } }),
        db,
      );

      // The schema validates a non-blank name but returns it untouched, so
      // the trim has to happen here or the spaces reach the column.
      expect(row()?.first_name).toBe('Asha');
      expect(row()?.last_name).toBe('Patil');
    });
  });

  describe('the attributes', () => {
    it('writes the alternate number', async () => {
      await saveRegistration(snapshot(), db);

      expect(valueOf(patientAttributeNames.ATTR_ALTERNATE_NUMBER)).toBe('9123456780');
    });

    it('skips the alternate number when it was left blank', async () => {
      await saveRegistration(snapshot({ personal: { alternateMobileNumber: '' } }), db);

      // An empty attribute row resolves to nothing on read-back and ships an
      // empty value on push, so it is not written at all.
      expect(valueOf(patientAttributeNames.ATTR_ALTERNATE_NUMBER)).toBeUndefined();
    });

    it('stamps the profile image timestamp even with no photo', async () => {
      await saveRegistration(snapshot({ personal: { photoPath: null } }), db);

      // The legacy writes it unconditionally — it is the save time, not the
      // photo time. Ported as-is.
      expect(valueOf(patientAttributeNames.ATTR_PROFILE_IMAGE_TIMESTAMP)).toEqual(
        expect.any(String),
      );
    });

    it('mints a registration number from the address initials', async () => {
      await saveRegistration(snapshot(), db);

      // country[0:2]/state[0:2]/cityVillage[0:2]/<random>, ported verbatim.
      expect(valueOf(patientAttributeNames.ATTR_REGISTRATION_NUMBER)).toMatch(
        /^In\/Ma\/Pu\/\d+$/,
      );
    });

    it('carries the moment the registration started', async () => {
      await saveRegistration(snapshot(), db);

      expect(valueOf(patientAttributeNames.ATTR_REGISTRATION_START)).toBe(STARTED_AT);
    });

    it('does not re-mint the registration number or the start time on an edit', async () => {
      await saveRegistration(snapshot({ mode: 'edit' }), db);

      // Both are create-only in the legacy, so the number stays stable for
      // the life of the patient rather than changing on every edit.
      expect(valueOf(patientAttributeNames.ATTR_REGISTRATION_NUMBER)).toBeUndefined();
      expect(valueOf(patientAttributeNames.ATTR_REGISTRATION_START)).toBeUndefined();
    });

    it('writes every attribute needing send', async () => {
      await saveRegistration(snapshot(), db);

      expect(attributes().every((a) => a.sync === SYNC_DIRTY)).toBe(true);
    });

    it('skips an attribute whose type the pull has not delivered, and still writes the patient', async () => {
      ctx.close();
      ctx = await createTestDb();
      db = ctx.db;
      // Only one of the four seeded — the master table is pull-filled, so a
      // device can genuinely be missing types.
      patientRepo.upsertAttributeTypes([ATTRIBUTE_TYPES[0]], db);

      await saveRegistration(snapshot(), db);

      // Losing an attribute beats failing the registration the patient is
      // the point of. Never written with an empty type uuid, as the legacy
      // did — those rows resolve to nothing on read-back.
      expect(row()?.uuid).toBe(PATIENT_UUID);
      expect(attributes()).toHaveLength(1);
      expect(attributes().every((a) => a.person_attribute_type_uuid !== '')).toBe(true);
    });
  });

  describe('the profile image', () => {
    it('records the path the photo service already wrote', async () => {
      await saveRegistration(snapshot(), db);

      const image = db
        .select()
        .from(imageRecords)
        .where(eq(imageRecords.patientuuid, PATIENT_UUID))
        .get();

      expect(image).toMatchObject({
        image_path: `file:///document/patient-photos/${PATIENT_UUID}.jpg`,
        image_type: 'PP',
        sync: SYNC_DIRTY,
      });
    });

    it('writes no image row when no photo was taken', async () => {
      await saveRegistration(snapshot({ personal: { photoPath: null } }), db);

      const images = db
        .select()
        .from(imageRecords)
        .where(eq(imageRecords.patientuuid, PATIENT_UUID))
        .all();

      expect(images).toHaveLength(0);
    });

    it('still puts the path on the patient row itself', async () => {
      await saveRegistration(snapshot(), db);

      // Both, deliberately: updatePatientPhoto does not mark the row dirty,
      // so the column rides along with the create instead.
      expect(row()?.patient_photo).toBe(`file:///document/patient-photos/${PATIENT_UUID}.jpg`);
    });
  });

  describe('atomicity', () => {
    it('writes nothing at all when the patient row collides', async () => {
      await saveRegistration(snapshot(), db);
      const before = attributes().length;

      // patientUuid is a fixed primary key, so a second save is a collision,
      // not a second patient — this is what the store's in-flight guard is
      // protecting against.
      await expect(saveRegistration(snapshot(), db)).rejects.toThrow();

      expect(attributes()).toHaveLength(before);
    });
  });
});
