import { deletePatientPhoto } from '@/core/services/photo';
import { newUuid } from '@/core/db/uuid';
import { logger } from '@/core/utils/logger';

import { saveRegistration } from '../../data/registration.repository';

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

// Mocked so a failed save does not print [ERROR] through a green suite, and so
// what gets logged can be asserted — a failed write leaves no other trace.
jest.mock('@/core/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// The write itself is work item 6. The real module throws "not implemented",
// which is exactly the failure path below — but it is mocked anyway, because
// these tests are about what the STORE does with a result, not about what the
// repository returns.
jest.mock('../../data/registration.repository', () => ({
  saveRegistration: jest.fn(),
}));

const mintedUuid = newUuid as jest.MockedFunction<typeof newUuid>;
const deletePhoto = deletePatientPhoto as jest.MockedFunction<typeof deletePatientPhoto>;
const save = saveRegistration as jest.MockedFunction<typeof saveRegistration>;

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

/**
 * Save. `PATIENT_ADDRESS_INFO_PLAN.md` section 10 numbers these 7 to 9 — the
 * address screen's half of this file, added on top of the store the shared
 * plan built. The file itself does not number its tests, so neither do these.
 */
describe('submitRegistration', () => {
  /** A complete draft, the state the screen is in when Save is tapped. */
  const readyToSave = () => {
    store().startRegistration({ mode: 'create' });
    store().setPersonal(PERSONAL);
    store().setAddress(ADDRESS);
  };

  beforeEach(() => {
    // clearAllMocks keeps implementations, but this one is overridden per test,
    // so it is re-stated rather than set once at the mock.
    save.mockResolvedValue(undefined);
  });

  it('hands the repository the whole draft, with the nulls resolved', async () => {
    readyToSave();

    await store().submitRegistration();

    expect(save).toHaveBeenCalledWith({
      mode: 'create',
      patientUuid: FIRST_UUID,
      // Stamped by startRegistration, not by the caller — asserted as a shape
      // rather than a value, since it is the clock at the moment of entry.
      startedAt: expect.any(String) as unknown as string,
      personal: PERSONAL,
      address: ADDRESS,
    });
  });

  it('stamps startedAt when the registration begins, not when it is saved', () => {
    store().startRegistration({ mode: 'create' });

    // It is the value of the patientRegistrationStartDateTime attribute. The
    // legacy stamps it on the Privacy Notice screen, which this port skips,
    // so entry to the flow is the moment that owns it.
    expect(store().startedAt).toEqual(expect.any(String));
  });

  it('clears startedAt on discard, with the rest of the draft', async () => {
    store().startRegistration({ mode: 'create' });

    await store().discardRegistration();

    expect(store().startedAt).toBeNull();
  });

  it('clears the draft and returns the uuid on success', async () => {
    readyToSave();

    const result = await store().submitRegistration();

    expect(result).toEqual({ ok: true, patientUuid: FIRST_UUID });

    // Cleared on SUCCESS, not only on discard. A real patient's name, date of
    // birth and phone numbers must not sit in a module-global store for the
    // rest of the session.
    expect(store().patientUuid).toBeNull();
    expect(store().personal).toBeNull();
    expect(store().address).toBeNull();
    expect(store().isSaving).toBe(false);
  });

  it('returns the uuid even though the draft no longer holds it', async () => {
    readyToSave();

    const result = await store().submitRegistration();

    // The whole reason the result carries it: by the time the screen reads
    // the result, the store has nothing left to read it from.
    expect(result).toEqual({ ok: true, patientUuid: FIRST_UUID });
    expect(store().patientUuid).toBeNull();
  });

  it('returns failed and KEEPS the draft when the repository rejects', async () => {
    save.mockRejectedValueOnce(new Error('disk is full'));
    readyToSave();

    const result = await store().submitRegistration();

    expect(result).toEqual({ ok: false, reason: 'failed' });

    // The user is still on the form and can tap Save again. Clearing here
    // would lose a registration that was never written.
    expect(store().patientUuid).toBe(FIRST_UUID);
    expect(store().personal).toEqual(PERSONAL);
    expect(store().address).toEqual(ADDRESS);
    expect(store().isSaving).toBe(false);
  });

  it('logs a failure without logging the draft', async () => {
    save.mockRejectedValueOnce(new Error('disk is full'));
    readyToSave();

    await store().submitRegistration();

    const calls = (logger.error as jest.Mock).mock.calls;

    // Two arguments, a fixed message and the error — the structural version of
    // "the error only". A third argument is how the draft would get in.
    expect(calls).toHaveLength(1);
    expect(calls[0]).toHaveLength(2);
    expect(calls[0][0]).toBe('[Registration] Save failed');
    expect(calls[0][1]).toBeInstanceOf(Error);

    // And the same claim again by inspection, because everything in the draft
    // is patient data. An Error serialises to `{}` on its own, so the replacer
    // is what makes this read the message rather than silently passing.
    const logged = JSON.stringify(calls, (_key, value) =>
      value instanceof Error ? value.message : value,
    );

    expect(logged).toContain('disk is full');
    expect(logged).not.toContain(PERSONAL.firstName);
    expect(logged).not.toContain(PERSONAL.mobileNumber);
    expect(logged).not.toContain(ADDRESS.village);
  });

  it('does not call the repository twice while a save is in flight', async () => {
    let finishTheWrite: () => void = () => {};
    save.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishTheWrite = resolve;
      }),
    );
    readyToSave();

    const first = store().submitRegistration();
    const second = await store().submitRegistration();

    // `patientUuid` is a fixed primary key, so a second write is a PK
    // collision, not a duplicate patient: it fails, the screen says "could not
    // save", and the patient was in fact registered.
    expect(save).toHaveBeenCalledTimes(1);
    expect(second).toEqual({ ok: false, reason: 'busy' });

    finishTheWrite();

    await expect(first).resolves.toEqual({ ok: true, patientUuid: FIRST_UUID });
  });

  it('leaves the draft alone when it refuses a second call', async () => {
    let finishTheWrite: () => void = () => {};
    save.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishTheWrite = resolve;
      }),
    );
    readyToSave();

    const first = store().submitRegistration();
    await store().submitRegistration();

    // `busy` is the call that did nothing — it must not clear, not log and
    // not disturb the save already running.
    expect(store().personal).toEqual(PERSONAL);
    expect(store().isSaving).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();

    finishTheWrite();
    await first;
  });

  it('is in flight only while the write is running', async () => {
    let finishTheWrite: () => void = () => {};
    save.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishTheWrite = resolve;
      }),
    );
    readyToSave();

    expect(store().isSaving).toBe(false);

    const first = store().submitRegistration();

    // Set SYNCHRONOUSLY, before the first await — the footer button is
    // disabled off this, and a flag set one tick late is a flag the second
    // tap gets past.
    expect(store().isSaving).toBe(true);

    finishTheWrite();
    await first;

    expect(store().isSaving).toBe(false);
  });

  it('refuses an incomplete draft without calling the repository', async () => {
    // Unreachable through the UI: step 2 is only arrived at through step 1's
    // Continue. Checked because the repository takes all four as non-null.
    store().startRegistration({ mode: 'create' });

    const result = await store().submitRegistration();

    expect(result).toEqual({ ok: false, reason: 'failed' });
    expect(save).not.toHaveBeenCalled();
    expect(store().patientUuid).toBe(FIRST_UUID);
  });
});
