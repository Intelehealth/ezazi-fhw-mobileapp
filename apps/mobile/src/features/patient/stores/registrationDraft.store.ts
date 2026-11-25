import { create } from 'zustand';

import { newUuid } from '@/core/db/uuid';
import { deletePatientPhoto } from '@/core/services/photo';
import { localIsoTimestamp } from '@/core/utils/datetime';
import { logger } from '@/core/utils/logger';
import { saveRegistration } from '../data/registration.repository';

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

/**
 * What Save hands back to the screen.
 *
 * A plain union, not the API layer's `ApiResult`: a failed local `transact()`
 * is none of `ApiError`'s kinds, and dressing it as one would invite the
 * screen to run it through `getApiErrorBanner` and show network copy for a
 * disk write.
 *
 * `reason` exists for one case and earns its keep there. `busy` means a save
 * was already in flight and this call did nothing — the screen must NOT show
 * "could not save" for it, because the first save is still going and will very
 * likely succeed. Only `failed` is a real failure the user has to see.
 *
 * `patientUuid` comes back on success because the draft is cleared by then, so
 * the screen can no longer read it off the store — and item 6 needs it to
 * route with.
 */
export type SubmitRegistrationResult =
  | { ok: true; patientUuid: string }
  | { ok: false; reason: 'busy' | 'failed' };

interface StartRegistrationArgs {
  mode: RegistrationMode;
  /** Required for `edit` — the patient being edited. Ignored for `create`. */
  patientUuid?: string;
}

interface RegistrationDraftState {
  mode: RegistrationMode;
  patientUuid: string | null;
  /**
   * When this registration began — the value of the
   * `patientRegistrationStartDateTime` attribute at save.
   *
   * The legacy stamps it on the Privacy Notice screen when consent is
   * accepted, reads it back at save and clears it after. This port skips that
   * screen, so it is stamped on entry to the flow instead, beside the uuid
   * (Arpan, 2026-11-25). The meaning shifts slightly — flow entered rather
   * than consent accepted — and is arguably the more accurate of the two.
   *
   * Local time, like every other timestamp on `tbl_patient`.
   */
  startedAt: string | null;
  personal: PersonalDraft | null;
  address: AddressDraft | null;
  /**
   * True while `submitRegistration` is writing. The footer's Register Patient
   * button is disabled off this, and the action itself re-checks it — the
   * keyboard's Done key reaches the handler without going through the button.
   */
  isSaving: boolean;

  startRegistration: (args: StartRegistrationArgs) => void;
  setPersonal: (values: PersonalDraft) => void;
  setAddress: (values: AddressDraft) => void;
  submitRegistration: () => Promise<SubmitRegistrationResult>;
  discardRegistration: () => Promise<void>;
}

const EMPTY = {
  patientUuid: null,
  startedAt: null,
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
      // Stamped beside the uuid, and for the same reason: this is the one
      // moment that owns "the registration started". Edit gets one too — the
      // attribute is only WRITTEN on create, and that is the repository's
      // call to make, not something to encode by leaving a field null here.
      startedAt: localIsoTimestamp(),
    });
  },

  setPersonal: (values) => {
    set({ personal: values });
  },

  setAddress: (values) => {
    set({ address: values });
  },

  /**
   * Save. The ONE path from a screen to the patient row.
   *
   * This is the seam, not a convenience: eslint blocks presentation from
   * importing `features/*\/data`, so the Register Patient button cannot call
   * the repository itself. The store can, exactly as
   * `location.store.fetchLocations()` stands between `SetupScreen` and
   * `location.api.ts`.
   *
   * THE IN-FLIGHT GUARD IS NOT A NICETY. `patientUuid` is a fixed primary key,
   * so a double tap is not a harmless second write — it is a PK collision. The
   * second call fails, the screen says "could not save", and the patient was
   * in fact registered. Hence `busy`, which the screen must stay quiet about.
   *
   * THE DRAFT IS CLEARED ON SUCCESS, not only on discard. Otherwise a real
   * patient's name, date of birth and phone numbers sit in a module-global
   * store for the rest of the session — and the "no row exists yet, so there
   * is nothing to drift from" answer to tripwire 9 stops being true the moment
   * the write returns.
   *
   * It never throws at the screen. A rejection from the repository becomes
   * `{ ok: false, reason: 'failed' }` here, so the screen has one shape to
   * handle and no try/catch of its own.
   */
  submitRegistration: async () => {
    const { isSaving, mode, patientUuid, startedAt, personal, address } = get();

    if (isSaving) {
      return { ok: false, reason: 'busy' };
    }

    // Unreachable through the UI — step 2 is only arrived at through step 1's
    // Continue, which runs setPersonal, and the screen writes setAddress
    // immediately before calling this. It is still checked rather than
    // asserted, because the repository takes all four as non-null and the
    // alternative is a crash on a cleared store.
    if (patientUuid === null || personal === null || address === null) {
      logger.error('[Registration] Save called with an incomplete draft');
      return { ok: false, reason: 'failed' };
    }

    set({ isSaving: true });

    try {
      await saveRegistration({ mode, patientUuid, startedAt, personal, address });
    } catch (error) {
      // The error only — never the draft. Everything in it is patient data.
      logger.error('[Registration] Save failed', error);
      set({ isSaving: false });
      return { ok: false, reason: 'failed' };
    }

    // Clears isSaving too, through EMPTY.
    set({ ...EMPTY, mode: 'create' });

    return { ok: true, patientUuid };
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
