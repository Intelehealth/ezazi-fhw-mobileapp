import type {
  AddressDraft,
  PersonalDraft,
  RegistrationMode,
} from '../stores/registrationDraft.store';

/**
 * The write seam for patient registration. NOT IMPLEMENTED YET — work item 6
 * writes the body.
 *
 * It exists now, throwing, because the screen has to handle the failure path
 * and the store has to own the in-flight guard, and neither can be built or
 * tested against a function that does not exist. Everything above this file is
 * finished and testable without the row ever being written.
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
 * named after it.
 */
export interface RegistrationSnapshot {
  mode: RegistrationMode;
  patientUuid: string;
  personal: PersonalDraft;
  address: AddressDraft;
}

/**
 * Writes the patient row and its attributes, and resolves when the row exists.
 *
 * REJECTS rather than returning a result. The store turns a rejection into its
 * own `{ ok: false }` union so the screen never has to catch — see
 * `submitRegistration`. Keeping the throw here means item 6 can let a failed
 * `transact()` propagate instead of inventing an error shape for it.
 *
 * `async`, so the failure arrives as a rejected promise rather than a
 * synchronous throw. The two are not the same thing at a call site that does
 * not `await` inside its `try`, and this contract must not change under the
 * store when item 6 fills the body in.
 *
 * Item 6 replaces this with the mapper from `{ personal, address }` to
 * `PatientInput` and the call into `core/useCases` — which is where the
 * `District:Village` encoding runs, and the one place that decides which column
 * each field becomes.
 */
export async function saveRegistration(_snapshot: RegistrationSnapshot): Promise<void> {
  throw new Error(
    'saveRegistration is not implemented — work item 6 writes the patient row.',
  );
}
