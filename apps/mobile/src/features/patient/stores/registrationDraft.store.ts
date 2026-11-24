import { create } from 'zustand';

import { newUuid } from '@/core/db/uuid';
import { deletePatientPhoto } from '@/core/services/photo';

/**
 * The in-progress registration, shared by the two steps.
 *
 * This is the port's answer to the legacy's `PatientRegistrationDraft.kt`,
 * which held one mutable `PatientDTO` that both fragments wrote into — so
 * anything a step forgot to copy back before navigating was lost. Here the two
 * halves are named and separate, each screen owns only its own, and one mapper
 * turns the pair into a patient row at save time.
 *
 * NOT a tripwire 9 violation. Tripwire 9 says clinical data lives in the DB,
 * never in Zustand. Nothing here is clinical data yet — it is an unsaved form
 * that exists only between "Add Patient" and "Register Patient", and is thrown
 * away if the user leaves. The moment it becomes a patient it goes to SQLite
 * and this store is cleared.
 */

/**
 * The personal half.
 *
 * Declared here rather than imported because `domain/personalInfoForm.schema.ts`
 * does not exist yet — the personal screen chat writes it. That chat should
 * make its `PersonalInfoFormValues` structurally match this, and tsc will say
 * so at the `setPersonal` call site if it does not. Replacing this with a
 * `z.infer` import later is a safe tidy-up, not a requirement.
 *
 * GENDER is deliberately absent: it is not a form field. `createPatient`
 * hardcodes `gender: 'F'` as a write-side constant with a test pinning it.
 */
export interface PersonalDraft {
  firstName: string;
  middleName: string;
  lastName: string;
  /** Always `yyyy-MM-dd`. The `DD-MM-YY` in the field is display only. */
  dateOfBirth: string;
  /** Derived from the date of birth, kept only to re-fill the field. Never stored. */
  age: string;
  mobileNumber: string;
  alternateMobileNumber: string;
  /** Absolute path from `capturePhoto`, or null when no photo was taken. */
  photoPath: string | null;
}

/**
 * The address half. COUNTRY is absent for the same reason GENDER is: it is not
 * a form field. It comes from `clientConfig.countryName` at save time, never
 * from the widget.
 */
export interface AddressDraft {
  state: string;
  /** Empty when the chosen state has no districts. Folded into `city_village`. */
  district: string;
  village: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
}

export type RegistrationMode = 'create' | 'edit';

interface StartRegistrationArgs {
  mode: RegistrationMode;
  /** Required for `edit` — the patient being edited. Ignored for `create`. */
  patientUuid?: string;
}

interface RegistrationDraftState {
  mode: RegistrationMode;
  patientUuid: string | null;
  personal: PersonalDraft | null;
  address: AddressDraft | null;
  /**
   * Set by `submitRegistration`, which the ADDRESS screen chat adds to this
   * file. Declared here so the shape is settled in one place and that chat
   * extends the store rather than redefining it.
   */
  isSaving: boolean;

  startRegistration: (args: StartRegistrationArgs) => void;
  setPersonal: (values: PersonalDraft) => void;
  setAddress: (values: AddressDraft) => void;
  discardRegistration: () => Promise<void>;
}

const EMPTY = {
  patientUuid: null,
  personal: null,
  address: null,
  isSaving: false,
} as const;

export const useRegistrationDraftStore = create<RegistrationDraftState>((set, get) => ({
  mode: 'create',
  ...EMPTY,

  /**
   * Called once on entry to the flow. The uuid is minted here, not lazily at
   * first use the way `AddNewPatientActivity.resolveUuid()` does it — the
   * Activity had no entry hook that owned the draft, and a store does.
   *
   * IDEMPOTENT ON CREATE. A second call while a create is already in flight
   * returns without touching anything. Without that guard a stray call mints a
   * fresh uuid, and the photo already captured under the old one is orphaned
   * on disk with nothing left that can name it.
   *
   * EDIT always resets, because re-entering edit for a DIFFERENT patient must
   * adopt that patient's uuid rather than keep the previous one.
   */
  startRegistration: ({ mode, patientUuid }) => {
    const current = get();

    if (mode === 'create' && current.mode === 'create' && current.patientUuid !== null) {
      return;
    }

    set({
      ...EMPTY,
      mode,
      patientUuid: mode === 'edit' ? (patientUuid ?? null) : newUuid(),
    });
  },

  setPersonal: (values) => {
    set({ personal: values });
  },

  setAddress: (values) => {
    set({ address: values });
  },

  /**
   * Abandoning the registration. Deletes the captured photo, then clears.
   *
   * THE DELETE KEYS ON THE UUID, never on `personal.photoPath`. Capture writes
   * the path into React Hook Form and `setPersonal` only runs on a valid
   * Continue — so on the commonest abandon, take a photo on step 1 and then
   * close, `personal` is still null and a path-based delete would find nothing
   * and leave the file behind forever. The uuid is enough, because the photo
   * service names the file from it.
   *
   * The delete happens HERE rather than at the call site so the order cannot
   * be got wrong: clearing first would throw away the only thing that can name
   * the file. `deletePatientPhoto` is best effort and never throws, so a
   * locked file cannot trap the user on a form they asked to leave.
   */
  discardRegistration: async () => {
    const { patientUuid } = get();

    if (patientUuid !== null) {
      await deletePatientPhoto(patientUuid);
    }

    set({ ...EMPTY, mode: 'create' });
  },
}));
