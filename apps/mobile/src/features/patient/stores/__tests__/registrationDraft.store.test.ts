import { deletePatientPhoto } from '@/core/services/photo';
import { newUuid } from '@/core/db/uuid';

import {
  useRegistrationDraftStore,
  type AddressDraft,
  type PersonalDraft,
} from '../registrationDraft.store';

jest.mock('@/core/services/photo', () => ({
  deletePatientPhoto: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/core/db/uuid', () => ({
  newUuid: jest.fn(),
}));

const mintedUuid = newUuid as jest.MockedFunction<typeof newUuid>;
const deletePhoto = deletePatientPhoto as jest.MockedFunction<typeof deletePatientPhoto>;

// Raw uuid literals are banned under src/ by eslint's NO_RAW_UUID rule, which
// excludes src/**/__tests__/** — exactly so a test can name one.
const FIRST_UUID = '6f3c1b2a-0d5e-4a87-9c11-2b7f8e4d6a30';
const SECOND_UUID = 'c0ffee00-1111-4222-8333-444455556666';
const EXISTING_PATIENT = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

const PERSONAL: PersonalDraft = {
  firstName: 'Asha',
  middleName: '',
  lastName: 'Patil',
  dateOfBirth: '1998-04-28',
  age: '28',
  mobileNumber: '9876543210',
  alternateMobileNumber: '',
  photoPath: 'file:///document/patient-photos/x.jpg',
};

const ADDRESS: AddressDraft = {
  state: 'Maharashtra',
  district: 'Pune',
  village: 'Sinnar',
  addressLine1: '12 Market Road',
  addressLine2: '',
  postalCode: '411038',
};

const store = () => useRegistrationDraftStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  mintedUuid.mockReturnValue(FIRST_UUID);
  // Zustand state is module-global and survives between tests.
  useRegistrationDraftStore.setState({
    mode: 'create',
    patientUuid: null,
    personal: null,
    address: null,
    isSaving: false,
  });
});

describe('startRegistration', () => {
  it('mints a uuid on create', () => {
    store().startRegistration({ mode: 'create' });

    expect(store().patientUuid).toBe(FIRST_UUID);
    expect(store().mode).toBe('create');
  });

  it('does NOT re-mint on a second create call', () => {
    store().startRegistration({ mode: 'create' });
    mintedUuid.mockReturnValue(SECOND_UUID);

    store().startRegistration({ mode: 'create' });

    // Idempotent by decision. A fresh uuid here orphans the photo already
    // captured under the first one — nothing would be able to name it again.
    expect(store().patientUuid).toBe(FIRST_UUID);
    expect(mintedUuid).toHaveBeenCalledTimes(1);
  });

  it('keeps the half already captured when called a second time', () => {
    store().startRegistration({ mode: 'create' });
    store().setPersonal(PERSONAL);

    store().startRegistration({ mode: 'create' });

    expect(store().personal).toEqual(PERSONAL);
  });

  it('adopts the given uuid on edit and mints nothing', () => {
    store().startRegistration({ mode: 'edit', patientUuid: EXISTING_PATIENT });

    expect(store().patientUuid).toBe(EXISTING_PATIENT);
    expect(store().mode).toBe('edit');
    expect(mintedUuid).not.toHaveBeenCalled();
  });

  it('resets on edit even when a registration is already in flight', () => {
    store().startRegistration({ mode: 'create' });
    store().setPersonal(PERSONAL);

    store().startRegistration({ mode: 'edit', patientUuid: EXISTING_PATIENT });

    // Re-entering edit for a DIFFERENT patient must adopt that patient's
    // uuid, so unlike create this is not idempotent.
    expect(store().patientUuid).toBe(EXISTING_PATIENT);
    expect(store().personal).toBeNull();
  });
});

describe('setPersonal and setAddress', () => {
  it('keeps the two halves separate', () => {
    store().startRegistration({ mode: 'create' });

    store().setPersonal(PERSONAL);
    store().setAddress(ADDRESS);

    expect(store().personal).toEqual(PERSONAL);
    expect(store().address).toEqual(ADDRESS);
  });

  it('replaces a half rather than merging it', () => {
    store().startRegistration({ mode: 'create' });
    store().setPersonal(PERSONAL);

    store().setPersonal({ ...PERSONAL, firstName: 'Meera', photoPath: null });

    expect(store().personal?.firstName).toBe('Meera');
    expect(store().personal?.photoPath).toBeNull();
  });
});

describe('discardRegistration', () => {
  it('deletes the photo keyed on the uuid', async () => {
    store().startRegistration({ mode: 'create' });

    await store().discardRegistration();

    expect(deletePhoto).toHaveBeenCalledWith(FIRST_UUID);
  });

  it('deletes the photo even when no personal half was ever saved', async () => {
    store().startRegistration({ mode: 'create' });
    // The commonest abandon: a photo is taken on step 1, then the user closes
    // before Continue, so setPersonal never ran and personal is still null. A
    // path-based delete would find nothing and leave the file behind.
    expect(store().personal).toBeNull();

    await store().discardRegistration();

    expect(deletePhoto).toHaveBeenCalledWith(FIRST_UUID);
  });

  it('clears everything', async () => {
    store().startRegistration({ mode: 'edit', patientUuid: EXISTING_PATIENT });
    store().setPersonal(PERSONAL);
    store().setAddress(ADDRESS);

    await store().discardRegistration();

    expect(store().patientUuid).toBeNull();
    expect(store().personal).toBeNull();
    expect(store().address).toBeNull();
    expect(store().mode).toBe('create');
  });

  it('does not call the photo service when there is no uuid', async () => {
    await store().discardRegistration();

    expect(deletePhoto).not.toHaveBeenCalled();
  });

  it('mints a fresh uuid on the next create, because the old one is gone', async () => {
    store().startRegistration({ mode: 'create' });
    await store().discardRegistration();
    mintedUuid.mockReturnValue(SECOND_UUID);

    store().startRegistration({ mode: 'create' });

    expect(store().patientUuid).toBe(SECOND_UUID);
  });
});
